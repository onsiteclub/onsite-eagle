/**
 * request-ingest — Edge Function
 *
 * Webhook endpoint for Twilio SMS (WhatsApp deferred).
 * Flow:
 *   1. Validate webhook signature
 *   2. Normalize inbound payload → { phone_e164, channel, body }
 *   3. Upsert frm_site_workers by phone (auto-materialize)
 *   4. Check machine status — if offline, send auto-reply, skip parsing
 *   5. Load frm_patterns for the worker
 *   6. Call OpenAI (gpt-4o) to parse the message
 *   7. Insert frm_material_requests with source='ai_parsed' or 'ai_ambiguous'
 *   8. Send acknowledgment auto-reply
 *   9. Log inbound + outbound in frm_messages
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') || '';
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---- OpenAI parser prompt ----
// Output is always wrapped as { "orders": [...] } for JSON-mode compatibility.
const SYSTEM_PROMPT = `You are a materials-order parser for a construction lumberyard.
Input: one text message from a construction worker, in any language.
Output: strict JSON in the shape { "orders": [ ... ] }. English only inside. No prose, no markdown.

Each order object has these fields:
- lot: string or null  (e.g. "15", "22A", "70-C", "15B", null if truly absent)
- material: string or null  (canonical English, e.g. "OSB 5/8\\"", "2x6 8ft SPF", "shingles bundle")
- quantity: number or null
- confidence: number 0-1
- language: ISO-639-1 code of the input
- notes: string or null (anything the operator should know)

LOT EXTRACTION is the single most valuable field. Extract it aggressively.
Recognize lot in these forms (any language, any position in the message):
- Explicit markers (English): "lot 15", "LOT 15", "L15", "l15", "#15", "house 15"
- Explicit markers (Portuguese): "lote 15", "lt 15", "casa 15"
- Explicit markers (Spanish): "lote 15", "casa 15"
- Explicit markers (Tagalog): "bahay 15", "lote 15"
- Suffix formats: "22A", "70-C", "15-B", "15.A", "15/A", "15B"
- Compact: "lot15" (no space), "L15B"
- With preposition: "for lot 15", "to 15", "para o 15", "at 15"
- Standalone number if clearly a lot reference (e.g. "15 - 10 2x6"): yes
- Standalone number if ambiguous with quantity or material spec (e.g. "send 10"): no
- Multiple lots in one message: return multiple order objects, one per lot

Preserve the lot EXACTLY as the worker wrote it (keep letter suffixes, dashes,
leading zeros). Do not normalize "22A" to "22". Do not normalize "70-C" to "70C".

Rules:
- If the message contains one order, return { "orders": [ <single object> ] }.
- If multiple orders, return all of them inside the orders array.
- If lot is genuinely absent (no marker AND no plausible bare number), set null.
- Use the worker's prior vocabulary patterns (provided below) to resolve slang.
- Never fabricate numbers. If quantity is unclear, null.`;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Parse Twilio webhook (form-encoded)
    const formData = await req.text();
    const params = new URLSearchParams(formData);
    const raw: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      raw[key] = value;
    }

    const phone = raw.From || '';
    const toNumber = raw.To || '';
    const body = raw.Body || '';

    if (!phone || !toNumber || !body) {
      return twimlResponse('Missing phone or body');
    }

    // --- Step 0: Route by receiving number (multi-tenant) ---
    const { data: opNumber } = await supabase
      .from('frm_operator_numbers')
      .select('id, operator_id, site_id')
      .eq('phone_e164', toNumber)
      .eq('status', 'active')
      .maybeSingle();

    if (!opNumber) {
      return twimlResponse('This number is not yet configured. Contact your supervisor.');
    }

    // --- Step 0b: Auto-materialize a default jobsite if this number isn't linked yet.
    // Test mode: operator can start receiving SMS without pre-configuring a site.
    let siteId: string | null = opNumber.site_id;
    if (!siteId) {
      const { data: newSite, error: siteErr } = await supabase
        .from('frm_jobsites')
        .insert({ name: 'Default Site', builder_name: 'Default' })
        .select('id')
        .single();

      if (siteErr || !newSite) {
        console.error('Auto-create jobsite failed:', siteErr);
        return twimlResponse('Setup error. Contact your supervisor.');
      }

      siteId = newSite.id;
      await supabase
        .from('frm_operator_numbers')
        .update({ site_id: siteId })
        .eq('id', opNumber.id);
    }

    // --- Step 1: Find or create worker for this site ---
    const worker = await upsertWorker(phone, siteId);

    // --- Step 2: Check machine status ---
    const { data: jobsite } = await supabase
      .from('frm_jobsites')
      .select('id, machine_down, machine_down_reason')
      .eq('id', worker.jobsite_id)
      .single();

    if (jobsite?.machine_down) {
      const reason = jobsite.machine_down_reason || 'maintenance';
      const autoReply = `Machine is currently down (${reason}). Orders will resume shortly.`;

      await logMessage(worker.jobsite_id, null, 'worker', worker.id, worker.display_name || phone, body);
      await logMessage(worker.jobsite_id, null, 'system', null, 'Auto-reply', autoReply);
      await sendSms(phone, autoReply, toNumber);

      return twimlResponse(autoReply);
    }

    // --- Step 3: Load worker patterns ---
    const { data: patterns } = await supabase
      .from('frm_patterns')
      .select('keyword, canonical_material, confidence')
      .eq('worker_id', worker.id)
      .order('confidence', { ascending: false })
      .limit(20);

    // --- Step 4: Call OpenAI (gpt-4o by default) ---
    const patternsJson = JSON.stringify(patterns || []);
    const userPrompt = `Worker history (most recent canonical mappings):\n${patternsJson}\n\nMessage:\n${body}`;

    const parsed = await callOpenAI(userPrompt);
    const orders = Array.isArray(parsed?.orders) && parsed.orders.length > 0
      ? parsed.orders
      : [{ lot: null, material: null, quantity: null, confidence: 0, language: 'en', notes: 'parse_failed' }];

    // --- Step 5: Insert requests ---
    for (const order of orders) {
      const lotNumber = order.lot;
      const isAmbiguous = !lotNumber || !order.material || (order.confidence ?? 0) < 0.6;

      // Resolve lot UUID from lot_number
      let lotId: string | null = null;
      if (lotNumber) {
        const { data: lot } = await supabase
          .from('frm_lots')
          .select('id')
          .eq('jobsite_id', worker.jobsite_id)
          .eq('lot_number', String(lotNumber))
          .maybeSingle();
        lotId = lot?.id || null;
      }

      await supabase.from('frm_material_requests').insert({
        jobsite_id: worker.jobsite_id,
        lot_id: lotId, // NULL if no matching frm_lots row
        lot_text_hint: lotNumber ? String(lotNumber) : null, // what AI extracted, even if unmatched
        phase_id: null, // SMS-sourced requests have no phase context
        material_name: order.material || null,
        quantity: order.quantity || null,
        notes: order.notes || null,
        requested_by: null, // SMS worker has no core_profiles row
        requested_by_name: worker.display_name || phone,
        status: 'requested',
        raw_message: body,
        source: isAmbiguous ? 'ai_ambiguous' : 'ai_parsed',
        confidence: order.confidence ?? null,
        language_detected: order.language || null,
      });

      // Update pattern if we got a clear match
      if (order.material && order.confidence > 0.7) {
        await upsertPattern(worker.id, worker.jobsite_id, body.toLowerCase().trim(), order.material);
      }
    }

    // --- Step 6: Send acknowledgment ---
    const firstOrder = orders[0];
    let ackMessage: string;
    if (!firstOrder.lot) {
      ackMessage = 'Which lot?';
    } else {
      ackMessage = `✓ Got it — LOT ${firstOrder.lot}, ${firstOrder.material || 'material TBD'}`;
    }

    await logMessage(worker.jobsite_id, null, 'worker', worker.id, worker.display_name || phone, body);
    await logMessage(worker.jobsite_id, null, 'system', null, 'Auto-reply', ackMessage);
    await sendSms(phone, ackMessage, toNumber);

    // Update worker stats
    await supabase
      .from('frm_site_workers')
      .update({
        last_active_at: new Date().toISOString(),
        total_requests: (worker.total_requests || 0) + orders.length,
      })
      .eq('id', worker.id);

    return twimlResponse(ackMessage);
  } catch (err) {
    console.error('request-ingest error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ---- Helpers ----

interface Worker {
  id: string;
  worker_id: string | null;
  jobsite_id: string;
  display_name: string | null;
  total_requests: number;
}

async function upsertWorker(phone: string, siteId: string): Promise<Worker> {
  // Find existing worker by phone at THIS site (multi-tenant: same phone may
  // belong to different workers at different sites)
  const { data: existing } = await supabase
    .from('frm_site_workers')
    .select('id, worker_id, jobsite_id, display_name, total_requests')
    .eq('phone_e164', phone)
    .eq('jobsite_id', siteId)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) return existing as Worker;

  // Auto-materialize: create worker record scoped to the receiving site.
  // worker_id is NULL because SMS workers are phone-identified, not tied to
  // a core_profiles row. A real registration flow can fill it in later.
  const { data: newWorker, error } = await supabase
    .from('frm_site_workers')
    .insert({
      jobsite_id: siteId,
      worker_id: null,
      phone_e164: phone,
      display_name: null,
      first_seen_at: new Date().toISOString(),
      is_active: true,
    })
    .select('id, worker_id, jobsite_id, display_name, total_requests')
    .single();

  if (error) throw error;
  return newWorker as Worker;
}

async function logMessage(
  jobsiteId: string,
  lotId: string | null,
  senderType: string,
  senderId: string | null,
  senderName: string,
  content: string,
) {
  await supabase.from('frm_messages').insert({
    jobsite_id: jobsiteId,
    lot_id: lotId,
    sender_type: senderType,
    sender_id: senderId,
    sender_name: senderName,
    content,
  });
}

async function upsertPattern(
  workerId: string,
  jobsiteId: string,
  keyword: string,
  canonicalMaterial: string,
) {
  const { data: existing } = await supabase
    .from('frm_patterns')
    .select('id, sample_count')
    .eq('worker_id', workerId)
    .eq('keyword', keyword)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('frm_patterns')
      .update({
        canonical_material: canonicalMaterial,
        sample_count: (existing.sample_count || 1) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('frm_patterns').insert({
      worker_id: workerId,
      jobsite_id: jobsiteId,
      keyword,
      canonical_material: canonicalMaterial,
    });
  }
}

async function callOpenAI(userMessage: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 512,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errText}`);
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content || '{}';

  try {
    return JSON.parse(text);
  } catch {
    return { orders: [] };
  }
}

async function sendSms(to: string, body: string, from?: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('Twilio not configured, skipping SMS send');
    return;
  }

  // Priority: operator's own number (multi-tenant) > Messaging Service > fallback From
  const fromNumber = from || TWILIO_FROM_NUMBER;
  if (!fromNumber && !TWILIO_MESSAGING_SERVICE_SID) {
    console.warn('No From number or Messaging Service configured, skipping SMS send');
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const params: Record<string, string> = { To: to, Body: body };
  if (fromNumber) {
    params.From = fromNumber;
  } else if (TWILIO_MESSAGING_SERVICE_SID) {
    params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
  }

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
}

function twimlResponse(message: string) {
  // Return TwiML for Twilio webhook
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
