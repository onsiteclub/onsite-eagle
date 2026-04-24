/**
 * request-ingest — Edge Function
 *
 * Webhook endpoint for Twilio SMS. Decision tree:
 *
 * 1. Route by receiving number (multi-tenant).
 * 2. Auto-materialize a default jobsite if the number has no site yet.
 * 3. Upsert the worker for that jobsite.
 * 4. If machinist sent a message to this worker in the last 15 min tagged
 *    with a request_id → this worker SMS is a CLARIFICATION. Log it to
 *    that thread, don't parse as a new order.
 * 5. Expire stale awaiting_info orders (> 30 min old).
 * 6. Check machine status → auto-reply if down.
 * 7. Parse with OpenAI (gpt-4o).
 * 8. Branch:
 *      a. Empty-signal (no lot, no material, no qty) → reply with guidance,
 *         don't create an order.
 *      b. Lot-only reply + awaiting_info pending → MERGE into pending.
 *      c. Normal insert loop: each parsed order becomes a row.
 *         - status='requested' if has lot, else 'awaiting_info' (invisible
 *           in the machinist's queue until worker supplies the lot).
 * 9. Log the worker's raw message in frm_messages (linked to request_id).
 * 10. Send ack SMS back to the worker.
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

const CLARIFICATION_WINDOW_MIN = 15;
const AWAITING_EXPIRY_MIN = 30;
const PENDING_MERGE_WINDOW_MIN = 10;

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
    // Parse Twilio webhook
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

    // --- Step 1: Route by receiving number (multi-tenant) ---
    const { data: opNumber } = await supabase
      .from('frm_operator_numbers')
      .select('id, operator_id, site_id')
      .eq('phone_e164', toNumber)
      .eq('status', 'active')
      .maybeSingle();

    if (!opNumber) {
      return twimlResponse('This number is not yet configured. Contact your supervisor.');
    }

    // --- Step 2: Auto-materialize default jobsite if needed ---
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

    // --- Step 3: Upsert worker ---
    const worker = await upsertWorker(phone, siteId);

    // --- Step 4: Clarification detection ---
    // Scoped to THIS worker. Only fires when:
    //   (a) the worker has an OPEN request (status requested or awaiting_info)
    //   (b) the machinist replied to that open request in the last 15 min
    // Once the machinist taps Delivered (or the request is cancelled),
    // subsequent SMS from the same worker start a fresh order.
    const clarificationSince = new Date(
      Date.now() - CLARIFICATION_WINDOW_MIN * 60 * 1000,
    ).toISOString();

    const { data: openRequest } = await supabase
      .from('frm_material_requests')
      .select('id')
      .eq('jobsite_id', worker.jobsite_id)
      .eq('worker_phone', phone)
      .in('status', ['requested', 'awaiting_info'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openRequest) {
      const { data: recentMachinistReply } = await supabase
        .from('frm_messages')
        .select('id')
        .eq('request_id', openRequest.id)
        .eq('sender_type', 'machinist')
        .gte('created_at', clarificationSince)
        .limit(1)
        .maybeSingle();

      if (recentMachinistReply) {
        await logMessage({
          jobsiteId: worker.jobsite_id,
          requestId: openRequest.id,
          senderType: 'worker',
          senderId: null,
          senderName: worker.display_name || phone,
          content: body,
        });
        const ack = '✓ Noted';
        await sendSms(phone, ack, toNumber);
        return twimlResponse(ack);
      }
    }

    // --- Step 5: Expire stale awaiting_info ---
    const expirySince = new Date(
      Date.now() - AWAITING_EXPIRY_MIN * 60 * 1000,
    ).toISOString();
    await supabase
      .from('frm_material_requests')
      .update({
        status: 'cancelled',
        notes: 'Auto-cancelled: worker did not provide lot within 30 min',
      })
      .eq('jobsite_id', worker.jobsite_id)
      .eq('status', 'awaiting_info')
      .lt('created_at', expirySince);

    // --- Step 6: Machine-down auto-reply ---
    const { data: jobsite } = await supabase
      .from('frm_jobsites')
      .select('id, machine_down, machine_down_reason')
      .eq('id', worker.jobsite_id)
      .single();

    if (jobsite?.machine_down) {
      const reason = jobsite.machine_down_reason || 'maintenance';
      const autoReply = `Machine is currently down (${reason}). Orders will resume shortly.`;
      await sendSms(phone, autoReply, toNumber);
      return twimlResponse(autoReply);
    }

    // --- Step 7: Parse with OpenAI ---
    const { data: patterns } = await supabase
      .from('frm_patterns')
      .select('keyword, canonical_material, confidence')
      .eq('worker_id', worker.id)
      .order('confidence', { ascending: false })
      .limit(20);

    const patternsJson = JSON.stringify(patterns || []);
    const userPrompt = `Worker history (most recent canonical mappings):\n${patternsJson}\n\nMessage:\n${body}`;
    const parsed = await callOpenAI(userPrompt);
    const orders = Array.isArray(parsed?.orders) && parsed.orders.length > 0
      ? parsed.orders
      : [{ lot: null, material: null, quantity: null, confidence: 0, language: 'en', notes: 'parse_failed' }];

    // --- Step 8a: Empty-signal rejection ---
    // Worker sent something with no lot, no material, no quantity (e.g.
    // "oi tudo bem"). Don't create an order. Send guidance.
    const firstOrder = orders[0];
    if (
      orders.length === 1 &&
      !firstOrder.lot &&
      !firstOrder.material &&
      !firstOrder.quantity
    ) {
      const ack = "Please include a lot number and material (e.g. 'lot 15 10 2x6').";
      await sendSms(phone, ack, toNumber);
      return twimlResponse(ack);
    }

    // --- Step 8b: Continuation-merge (lot-only reply into awaiting_info) ---
    let ackMessage: string | null = null;
    const isLotOnlyReply =
      orders.length === 1 &&
      !!firstOrder.lot &&
      !firstOrder.material &&
      !firstOrder.quantity;

    if (isLotOnlyReply) {
      const mergeSince = new Date(
        Date.now() - PENDING_MERGE_WINDOW_MIN * 60 * 1000,
      ).toISOString();
      const { data: pending } = await supabase
        .from('frm_material_requests')
        .select('id, material_name, quantity, raw_message, confidence')
        .eq('jobsite_id', worker.jobsite_id)
        .eq('worker_phone', phone)
        .eq('status', 'awaiting_info')
        .gte('created_at', mergeSince)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pending) {
        const lotStr = String(firstOrder.lot);
        const { data: matchedLot } = await supabase
          .from('frm_lots')
          .select('id')
          .eq('jobsite_id', worker.jobsite_id)
          .eq('lot_number', lotStr)
          .maybeSingle();

        await supabase
          .from('frm_material_requests')
          .update({
            lot_id: matchedLot?.id || null,
            lot_text_hint: lotStr,
            raw_message: `${pending.raw_message}\n${body}`,
            status: 'requested',
            source: 'ai_parsed',
          })
          .eq('id', pending.id);

        await logMessage({
          jobsiteId: worker.jobsite_id,
          requestId: pending.id,
          senderType: 'worker',
          senderId: null,
          senderName: worker.display_name || phone,
          content: body,
        });

        ackMessage = `✓ Got it — LOT ${lotStr}, ${pending.material_name || 'material TBD'}${
          pending.quantity ? ` x ${pending.quantity}` : ''
        }`;
      }
    }

    // --- Step 8c: Normal insert loop ---
    if (ackMessage === null) {
      let firstInsertedId: string | null = null;

      for (const order of orders) {
        const lotNumber = order.lot;
        const hasLot = !!lotNumber;
        const isAmbiguous = !hasLot || !order.material || (order.confidence ?? 0) < 0.6;

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

        const { data: inserted } = await supabase
          .from('frm_material_requests')
          .insert({
            jobsite_id: worker.jobsite_id,
            lot_id: lotId,
            lot_text_hint: lotNumber ? String(lotNumber) : null,
            phase_id: null,
            material_name: order.material || null,
            quantity: order.quantity || null,
            notes: order.notes || null,
            requested_by: null,
            requested_by_name: worker.display_name || phone,
            worker_phone: phone,
            status: hasLot ? 'requested' : 'awaiting_info',
            raw_message: body,
            source: isAmbiguous ? 'ai_ambiguous' : 'ai_parsed',
            confidence: order.confidence ?? null,
            language_detected: order.language || null,
          })
          .select('id')
          .single();

        if (inserted && !firstInsertedId) firstInsertedId = inserted.id;

        if (order.material && order.confidence > 0.7) {
          await upsertPattern(worker.id, worker.jobsite_id, body.toLowerCase().trim(), order.material);
        }
      }

      // Log the worker's original message linked to the first inserted request
      if (firstInsertedId) {
        await logMessage({
          jobsiteId: worker.jobsite_id,
          requestId: firstInsertedId,
          senderType: 'worker',
          senderId: null,
          senderName: worker.display_name || phone,
          content: body,
        });
      }

      if (!firstOrder.lot) {
        ackMessage = 'Which lot?';
      } else {
        ackMessage = `✓ Got it — LOT ${firstOrder.lot}, ${firstOrder.material || 'material TBD'}`;
      }
    }

    await sendSms(phone, ackMessage, toNumber);

    // Update worker stats
    await supabase
      .from('frm_site_workers')
      .update({
        last_active_at: new Date().toISOString(),
        total_requests: (worker.total_requests || 0) + 1,
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
  const { data: existing } = await supabase
    .from('frm_site_workers')
    .select('id, worker_id, jobsite_id, display_name, total_requests')
    .eq('phone_e164', phone)
    .eq('jobsite_id', siteId)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) return existing as Worker;

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

async function logMessage(opts: {
  jobsiteId: string;
  requestId: string | null;
  senderType: string;
  senderId: string | null;
  senderName: string;
  content: string;
  lotId?: string | null;
}) {
  const { error } = await supabase.from('frm_messages').insert({
    jobsite_id: opts.jobsiteId,
    lot_id: opts.lotId ?? null,
    request_id: opts.requestId,
    sender_type: opts.senderType,
    sender_id: opts.senderId,
    sender_name: opts.senderName,
    content: opts.content,
  });
  if (error) {
    console.error('logMessage insert failed:', error, 'payload:', opts);
  }
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
  const fromNumber = from || TWILIO_FROM_NUMBER;
  if (!fromNumber && !TWILIO_MESSAGING_SERVICE_SID) {
    console.warn('No From number or Messaging Service configured');
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const params: Record<string, string> = { To: to, Body: body };
  if (fromNumber) params.From = fromNumber;
  else if (TWILIO_MESSAGING_SERVICE_SID) params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;

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
