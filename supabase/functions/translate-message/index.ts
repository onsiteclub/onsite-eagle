/**
 * translate-message — Edge Function
 *
 * Translates a free-form construction-worker SMS into English (default) or
 * any target language. Called on-demand from the operator_2 app when the
 * machinist taps the AI helper icon on a request card.
 *
 * Uses gpt-4o-mini (cheap: ~$0.00015 per translation).
 *
 * Request:  POST { text: string, target_lang?: "en" }
 * Response: 200 { translation: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

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

    const { text, target_lang = 'en' } = await req.json();
    if (!text || typeof text !== 'string') {
      return json({ error: 'text is required' }, 400);
    }

    const systemPrompt = `You translate short construction-site SMS messages into ${target_lang}.
Preserve numbers, lot references (e.g. "LOT 15"), and material codes verbatim.
Keep the original informal tone. Do not add commentary. Output only the translation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI translate error:', response.status, errText);
      return json({ error: 'Translation failed' }, 502);
    }

    const result = await response.json();
    const translation = result.choices?.[0]?.message?.content?.trim() || '';

    return json({ translation });
  } catch (err) {
    console.error('translate-message error:', err);
    return json({ error: 'Internal error', detail: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
