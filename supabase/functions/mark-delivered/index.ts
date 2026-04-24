/**
 * mark-delivered — Edge Function
 *
 * Called by the operator_2 app when the machinist taps ✓ Delivered on a
 * request card. Atomically:
 *   1. Marks the request status='delivered' with delivered_at=now()
 *   2. Sends "✓ Material delivered" SMS to the worker (accountability: the
 *      worker will complain if this fires without actual delivery).
 *   3. Logs the delivery-notification in frm_messages so it appears in
 *      the card's chat thread.
 *
 * Request:  POST { request_id: UUID }
 * Response: 200 { ok: true }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DELIVERY_NOTIFICATION = '✓ Material delivered';

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

    const { request_id } = await req.json();
    if (!request_id) return json({ error: 'request_id is required' }, 400);

    const { data: request, error: reqErr } = await supabase
      .from('frm_material_requests')
      .select('id, jobsite_id, worker_phone, status')
      .eq('id', request_id)
      .single();

    if (reqErr || !request) return json({ error: 'Request not found' }, 404);
    if (request.status === 'delivered') return json({ ok: true, note: 'already delivered' });

    // 1. Mark delivered
    const { error: updateErr } = await supabase
      .from('frm_material_requests')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    if (updateErr) {
      console.error('Update failed:', updateErr);
      return json({ error: 'Failed to mark delivered' }, 500);
    }

    // 2. Notify worker via SMS (accountability)
    if (request.worker_phone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      const { data: opNumber } = await supabase
        .from('frm_operator_numbers')
        .select('phone_e164')
        .eq('site_id', request.jobsite_id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (opNumber?.phone_e164) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
        try {
          await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: request.worker_phone,
              From: opNumber.phone_e164,
              Body: DELIVERY_NOTIFICATION,
            }).toString(),
          });
        } catch (smsErr) {
          // Don't block delivery on SMS failure; log and continue.
          console.error('Delivery SMS failed:', smsErr);
        }
      }
    }

    // 3. Log delivery notification in chat thread
    await supabase.from('frm_messages').insert({
      jobsite_id: request.jobsite_id,
      request_id: request.id,
      sender_type: 'system',
      sender_id: null,
      sender_name: 'Delivery',
      content: DELIVERY_NOTIFICATION,
    });

    return json({ ok: true });
  } catch (err) {
    console.error('mark-delivered error:', err);
    return json({ error: 'Internal error', detail: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
