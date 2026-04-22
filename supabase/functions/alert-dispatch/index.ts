/**
 * alert-dispatch — Edge Function
 *
 * Triggered by database webhook on INSERT to frm_warnings.
 * Sends SMS to the jobsite supervisor with the alert details.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') || '';
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    const warning = payload.record || payload;

    if (!warning.target_id || !warning.title) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    const jobsiteId = warning.target_id;

    // Find the supervisor (foreman) for this jobsite
    const { data: jobsite } = await supabase
      .from('frm_jobsites')
      .select('name, foreman_id')
      .eq('id', jobsiteId)
      .single();

    if (!jobsite?.foreman_id) {
      console.warn('No foreman assigned to jobsite', jobsiteId);
      return new Response(JSON.stringify({ ok: true, sent: false, reason: 'no_foreman' }));
    }

    // Get supervisor's phone
    const { data: profile } = await supabase
      .from('core_profiles')
      .select('phone, full_name')
      .eq('id', jobsite.foreman_id)
      .single();

    if (!profile?.phone) {
      console.warn('Supervisor has no phone number', jobsite.foreman_id);
      return new Response(JSON.stringify({ ok: true, sent: false, reason: 'no_phone' }));
    }

    // Send SMS
    const message = `⚠️ OnSite Alert — ${jobsite.name}\n${warning.title}\n${warning.description || ''}`;
    await sendSms(profile.phone, message);

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('alert-dispatch error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});

async function sendSms(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.warn('Twilio not configured, skipping SMS');
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(
      TWILIO_MESSAGING_SERVICE_SID
        ? { To: to, MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID, Body: body }
        : { To: to, From: TWILIO_FROM_NUMBER, Body: body }
    ).toString(),
  });
}
