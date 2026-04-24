/**
 * send-to-worker — Edge Function
 *
 * Called by the operator_2 app when the machinist types a Reply to a
 * specific request. Sends an SMS from the operator's Twilio number to the
 * worker's phone, and logs it in frm_messages tagged with request_id so it
 * appears in the card's chat thread.
 *
 * Request:  POST { request_id: UUID, text: string }
 * Response: 200 { ok: true, message_id: UUID }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData.user) return json({ error: 'Unauthorized' }, 401);

    const { request_id, text } = await req.json();
    if (!request_id || !text || typeof text !== 'string') {
      return json({ error: 'request_id and text are required' }, 400);
    }

    // 1. Load the request → jobsite_id, worker_phone
    const { data: request, error: reqErr } = await supabase
      .from('frm_material_requests')
      .select('id, jobsite_id, worker_phone')
      .eq('id', request_id)
      .single();

    if (reqErr || !request) return json({ error: 'Request not found' }, 404);
    if (!request.worker_phone) return json({ error: 'Request has no worker phone' }, 400);

    // 2. Find operator's Twilio number for this site (From number)
    const { data: opNumber } = await supabase
      .from('frm_operator_numbers')
      .select('phone_e164')
      .eq('site_id', request.jobsite_id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!opNumber?.phone_e164) {
      return json({ error: 'No active operator number for this site' }, 500);
    }

    // 3. Send SMS via Twilio
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return json({ error: 'Twilio not configured' }, 500);
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: request.worker_phone,
        From: opNumber.phone_e164,
        Body: text,
      }).toString(),
    });

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      console.error('Twilio send failed:', twilioRes.status, errText);
      return json({ error: 'SMS send failed', detail: errText }, 502);
    }

    // 4. Log the machinist message to the chat thread
    const { data: logged, error: logErr } = await supabase
      .from('frm_messages')
      .insert({
        jobsite_id: request.jobsite_id,
        request_id: request.id,
        sender_type: 'machinist',
        sender_id: authData.user.id,
        sender_name: authData.user.email || 'Machinist',
        content: text,
      })
      .select('id')
      .single();

    if (logErr) console.error('Message log failed:', logErr);

    return json({ ok: true, message_id: logged?.id || null });
  } catch (err) {
    console.error('send-to-worker error:', err);
    return json({ error: 'Internal error', detail: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
