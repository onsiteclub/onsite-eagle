// api/interpret.ts
// Voice-to-Expression API - Whisper + GPT-4o
// Vercel Serverless Function

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@onsite/logger';
import { apiLogger } from './lib/api-logger.js';
import { checkRateLimit } from './lib/rate-limit.js';
import { saveVoiceLog, detectLanguage, detectInformalTerms, extractEntities } from './lib/voice-logs.js';
import { looksLikeHallucination, parseGPTResponse } from './lib/voice-guards.js';

// Verifies a Supabase JWT and returns the user id, or null if missing/invalid.
// Used to attribute voice_logs to the authenticated user without trusting client claims.
async function getUserIdFromAuthHeader(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  try {
    const client = createClient(url, serviceKey);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

// Helper para extrair IP do request
function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return 'unknown';
}

// CORS - Allowed origins
const ALLOWED_ORIGINS = [
  // Production domains
  'https://calculator.onsiteclub.ca',
  'https://calc.onsiteclub.ca',
  'https://app.onsiteclub.ca',
  'https://monitor.onsiteclub.ca',
  // Vercel deployments
  'https://onsiteclub-calculator.vercel.app',
  'https://onsite-calculator.vercel.app',
  // Native apps (Capacitor)
  'capacitor://localhost',
  'https://localhost',
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
];

export function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) return true;
  // Allow only OUR project's Vercel preview deployments (not any .vercel.app)
  if (origin.endsWith('-onsiteclub-calculator.vercel.app') ||
      origin.endsWith('-onsite-calculator.vercel.app')) return true;
  return false;
}

// System prompt para GPT - SPEC V11 (Phase 4.1 — intent routing with per-intent parameters)
const SYSTEM_PROMPT = `You are a parser for a construction calculator.
Convert spoken phrases into mathematical expressions.

Return ONLY valid JSON with this shape:
  {
    "expression": "<math string>",          // REQUIRED — always a valid engine input
    "intent": "calculation|area|volume|conversion|stairs|triangle|unclear",
    "expected_dimension": "scalar|length|area|volume",
    "explanation_pt": "<short ≤200 chars>",
    "parameters": { ...intent-specific, see below... }
  }
The engine validates dimensions algebraically — intent/expected_dimension/parameters are HINTS.
Always include the best-effort "expression" even when an intent has parameters — it's the fallback.

PARAMETERS PER INTENT:

  "conversion" — "quinze metros em pés", "15 meters to feet"
    {"from": 15, "fromUnit": "m", "toUnit": "ft"}
    unit tokens: mm, cm, m, in, ft, yd, sqft, sqin, sqm, cuft, cuin, cum

  "stairs" — "escada de 9 pés com espelho de 7 polegadas", "stairs 9 feet rise, 7 inch riser"
    {"totalRise": 108, "riserHeight": 7}         — totalRise in inches; derive stepCount if possible
    Optional: "stepCount": number, "tread": number  (tread = run/depth in inches)

  "triangle" — "triângulo catetos três e quatro", "triangle sides 5 and 12"
    {"legA": 3, "legB": 4}                       — Pythagorean legs in inches
    Optional: "legC": number                     — hypotenuse if user gave it

  "calculation" / "area" / "volume" — no parameters needed, use "expression".
  "unclear" — use expression=" " and skip parameters.

FORMAT RULES:
- Operators: + - * /
- Fractions: 1/2, 3/8, 1/16 (NO spaces around /)
- Mixed numbers: whole SPACE fraction → "5 1/2", "3 3/4"
- Feet: apostrophe → "2'" or "2' 6"
- Inches: can be implicit or with quote → 5 or 5"
- Metric: use decimal (mm, cm, m) → "150mm", "2.5m"

UNIT RECOGNITION (canonical → variations):

INCH (polegada) → output as number or number":
- EN: inch, inches, in, inchs, inche, insh
- PT/portunhol: incha, inchas, polegada, polegadas
- ES: pulgada, pulgadas, pulg
- Noise: "in" (short), double-quote " sometimes missing

FT (pé/feet) → output with apostrophe ':
- EN: foot, feet, ft
- PT/portunhol: fit, fiti, fits, fiz, fid, fe, pé, pés
- ES: pie, pies, pié, piez
- Noise: single-quote ' sometimes missing

YD (jarda/yard):
- EN: yard, yards, yd, yerd, iard, jard
- ES: yarda, yardas

MM (milímetro):
- EN: mm, millimeter, millimeters, millimetre, mili, mill
- PT: milímetro, milímetros, mili, mm
- ES: milímetro, milímetros
- Noise: "mil" (dangerous - usually means thousand/1000, only means mm if explicitly followed by "imetro/imetros")

CM (centímetro):
- EN: cm, centimeter, centimeters, centimetre, see em, c em
- PT: centímetro, centímetros, centi, cm
- ES: centímetro, centímetros
- Noise: "cem" (becomes "same" in speech)

M (metro):
- EN: m, meter, meters, metre, meeter, meetah
- PT: metro, metros, m
- ES: metro, metros, mt

LANGUAGE (PT/EN/ES/FR + MIXED):
- "cinco e meio" / "five and a half" → "5 1/2"
- "três pés e duas" / "three feet two" → "3' 2"
- "metade de" / "half of" → "/ 2"
- "dobro" / "double" → "* 2"

BRAZILIAN INFORMAL (PORTUNHOL):
- "mai" / "mái" = mais (plus) → +
- "meno" / "menu" = menos (minus) → -
- "vei" / "véi" = vezes (times) → *
- "dividido por" / "dividir por" = divided by → /
- Numbers in Portuguese + units in English is COMMON

FRACTION WORDS:
- 1/2: meio, meia, half, haf, haff, medio, mitad
- 1/4: um quarto, quarter, qtr, cora, core, cuarto
- 3/4: três quartos, three quarters, threequarters, three four, tres cuartos
- 1/8: um oitavo, eighth, eit, ate, octavo
- 3/8: três oitavos, three eighths
- 5/8: cinco oitavos, five eighths
- 7/8: sete oitavos, seven eighths
- 1/16: um dezesseis avos, sixteenth

DECIMAL POINT:
- "point" / "dot" / "punto" = decimal separator
- "five point five" → "5.5"
- "dois ponto cinco" → "2.5"

SEQUENTIAL DIGITS (CRITICAL):
- When someone reads digits one by one, concatenate them into ONE number.
- "oh" or "O" in a digit sequence = 0 (zero). Example: "one oh four" → "104", "three oh five" → "305"
- "cinco três dois quatro" → "5324" (NOT "5,3,2,4" or "5 + 3 + 2 + 4")
- "um dois três" → "123"
- "sete oito cinco" → "785"
- "nine four two" → "942"
- "one oh four" → "104"
- "three oh eight" → "308"
- "five oh five" → "505"
- "dois um cinco zero" → "2150"
- Only separate numbers when there is an explicit operator word (mais/plus/menos/minus/vezes/times)

LARGE NUMBERS (CRITICAL - NO thousands separator):
- NEVER use dot or comma as thousands separator. NEVER output "10.000" or "1.325". Output PLAIN integers only.
- "mil" / "thousand" = 1000. Multiply the preceding number by 1000.
- "dez mil" → "10000" (NOT "10.000" or "10.")
- "vinte mil" → "20000" (NOT "20.000")
- "quinze mil" → "15000"
- "cem mil" → "100000"
- "mil trezentos e vinte e cinco" → "1325" (NOT "1.325")
- "two thousand five hundred" → "2500" (NOT "2.500" or "2,500")
- "mil e quinhentos" → "1500" (NOT "1.500")
- "tres mil" → "3000"
- "mil duzentos" → "1200"
- "dez mil e duzentos" → "10200"
- "cento e vinte" → "120"
- "duzentos e trinta e cinco" → "235"
- Dot (.) is ONLY allowed when user explicitly says "ponto" / "point" / "dot"
- Example: "cinco ponto cinco" → "5.5" (user explicitly said "ponto")
- If there is NO word "ponto"/"point"/"dot" in the speech, there should be NO dot in the output

PERCENTAGE (CRITICAL - use % symbol, NEVER /100):
- "percent" / "por cento" / "porcento" / "por ciento" / "pour cent" = %
- ALWAYS keep the % symbol in the output. NEVER convert to /100.
- "ten percent" → "10%" (NOT "10/100")
- "dez por cento" → "10%" (NOT "10/100")
- Supported formats:
  - "100 + 10%" → "100 + 10%"
  - "100 - 20%" → "100 - 20%"
  - "10% of 150" → "10% of 150"
  - "20% de 200" → "20% of 200"
  - "150 * 20%" → "150 * 20%"
- "quanto é dez por cento de cem" → "10% of 100"
- "add fifteen percent to two hundred" → "200 + 15%"
- "desconto de vinte por cento em mil" → "1000 - 20%"

DIMENSION SEPARATOR (lumber: "2x4"):
- "by" / "buy" / "bai" / "por" = x (multiply/dimension)
- "two by four" → "2x4"
- "dois por quatro" → "2x4"

CONNECTOR WORDS (ignore but understand context):
- "and" / "n" / "e" / "y" / "con" = connects number + fraction
- "one and a half" → "1 1/2"
- "uno y medio" → "1 1/2"
- "um e meio" → "1 1/2"

FIX COMMON SPEECH ERRORS:
- "103/8" → "10 3/8" (missing space)
- "51/2" → "5 1/2"
- Numbers run together → separate intelligently
- "dez incha" → "10" (inches implicit)
- "cinco fit" → "5'" (feet)

EXAMPLES:
"cinco e meio mais três e um quarto" → {"expression":"5 1/2 + 3 1/4"}
"ten and three eighths minus two" → {"expression":"10 3/8 - 2"}
"três pés e seis" → {"expression":"3' 6"}
"dobro de cinco" → {"expression":"5 * 2"}
"metade de dez e meio" → {"expression":"10 1/2 / 2"}
"dez inchas mai cinco" → {"expression":"10 + 5"}
"três fit e seis inchas" → {"expression":"3' 6"}
"cinco e meio incha" → {"expression":"5 1/2"}
"cento e cinquenta milímetros" → {"expression":"150mm"}
"dois metros e meio" → {"expression":"2.5m"}
"one and a haf" → {"expression":"1 1/2"}
"two by four" → {"expression":"2x4"}
"cinco ponto cinco" → {"expression":"5.5"}
"three n a quarter" → {"expression":"3 1/4"}
"uno y medio" → {"expression":"1 1/2"}
"dos por cuatro" → {"expression":"2x4"}
"mil trezentos e vinte e cinco" → {"expression":"1325"}
"mil trezentos e vinte e cinco mais dois mil" → {"expression":"1325 + 2000"}
"two thousand three hundred" → {"expression":"2300"}
"cinco três dois quatro" → {"expression":"5324"}
"cinco três dois quatro mais mil" → {"expression":"5324 + 1000"}
"um dois três mais quatro cinco seis" → {"expression":"123 + 456"}
"duzentos e trinta e cinco" → {"expression":"235"}
"dez mil" → {"expression":"10000"}
"dez mil mais cinco mil" → {"expression":"10000 + 5000"}
"vinte mil e trezentos" → {"expression":"20300"}
"ten percent of one hundred" → {"expression":"10% of 100"}
"cem mais dez por cento" → {"expression":"100 + 10%"}
"mil menos vinte por cento" → {"expression":"1000 - 20%"}
"quinze por cento de duzentos" → {"expression":"15% of 200"}
"two hundred plus five percent" → {"expression":"200 + 5%"}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>);
  const userId = await getUserIdFromAuthHeader(req.headers.authorization);

  // CORS - apenas origens permitidas (sem wildcard fallback)
  const origin = req.headers.origin || '';
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // Se origin ausente ou nao permitido, nao seta CORS header
  // Requests server-to-server (sem origin) ainda funcionam, mas sem CORS
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting — Phase 5.4 layered (per-device + per-IP + global) via Upstash
  // when configured, else Supabase COUNT. Device id is optional but gives a
  // tighter per-user bound than IP alone (NAT'd sites share IPs).
  const deviceHeader = Array.isArray(req.headers['x-device-id'])
    ? req.headers['x-device-id'][0]
    : req.headers['x-device-id'];
  if (!(await checkRateLimit(ip, deviceHeader))) {
    console.error('[API] Rate limited:', ip);
    apiLogger.voice.rateLimited(ip);
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  // Log request para contagem de rate limit
  apiLogger.voice.request(undefined, ip);

  // Check API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[API] Missing OPENAI_API_KEY');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Parse multipart form data
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve());
      req.on('error', reject);
    });

    const body = Buffer.concat(chunks);

    // Extract audio file from multipart
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // Simple multipart parser
    const parts = body.toString('binary').split(`--${boundary}`);
    let audioData: Buffer | null = null;
    let filename = 'audio.webm';
    const formFields: Record<string, string> = {};

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;

      if (part.includes('filename=')) {
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (filenameMatch) filename = filenameMatch[1];

        const content = part.slice(headerEnd + 4);
        const cleanContent = content.replace(/\r\n--$/, '').replace(/--\r\n$/, '');
        audioData = Buffer.from(cleanContent, 'binary');
      } else {
        // Text field
        const nameMatch = part.match(/name="([^"]+)"/);
        if (nameMatch) {
          formFields[nameMatch[1]] = part.slice(headerEnd + 4).replace(/\r\n--?$/, '').trim();
        }
      }
    }

    const hasVoiceTrainingConsent = formFields['voice_training_consent'] === '1';

    if (!audioData || audioData.length === 0) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Validar tamanho maximo (25MB = limite do Whisper API)
    if (audioData.length > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'Audio file too large (max 25MB)' });
    }

    // 1. Whisper transcription
    // Language: auto-detect by default, overridable via env var or query param
    const whisperLang = (req.query?.lang as string) || process.env.WHISPER_LANGUAGE || '';

    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioData)], { type: 'audio/webm' });
    formData.append('file', audioBlob, filename);
    formData.append('model', 'whisper-1');
    if (whisperLang) {
      formData.append('language', whisperLang);
    }
    // Phase 2.4 — anti-hallucination Whisper prompt.
    // Whisper has a tendency to fill silence/noise with its training data:
    // URLs, "thanks for watching", "subscribe", social-media call-to-actions.
    // Priming with domain context + explicit no-URL/no-chat rules cuts this.
    formData.append('prompt', [
      'Context: Construction calculator. User speaks numbers, fractions (half,',
      'quarter, eighth), feet, inches, yards, millimeters, centimeters, meters,',
      'and math operators (plus/minus/times/divided by).',
      'Never transcribe URLs, email addresses, website names (.com/.ca/.org),',
      'or social-media call-to-actions ("thanks for watching", "subscribe",',
      '"obrigado por assistir", "like and subscribe", "merci de regarder").',
      'If the audio is unclear or silent, output an empty string.',
      '',
      'Vocabulary hint — English: inches, feet, yards, half, quarter, eighth,',
      'plus, minus, times, divided by.',
      'Portuguese: polegada, pé, metro, milímetro, centímetro, meio, quarto,',
      'oitavo, mais, menos, vezes, dividido, ponto.',
      'Informal (portunhol): incha, inchas, fit, fiti, fits, mai, meno, mili,',
      'haf, haff.',
      'Spanish: pulgada, pie, yarda, metro, medio, cuarto, punto, por.',
      'Lumber dimensions: two by four, dois por quatro. Mixed multilingual speech.',
    ].join('\n'));

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errText = await whisperResponse.text();
      console.error('[Voice] Whisper error:', errText);
      apiLogger.voice.error('Whisper transcription failed', Date.now() - startTime, { error: errText }, undefined, ip);
      return res.status(500).json({ error: 'Transcription failed' });
    }

    const whisperResult = await whisperResponse.json();
    const transcribedText: string = whisperResult.text ?? '';

    // Phase 2.2 — anti-hallucination guard.
    // If Whisper returned a URL, "thanks for watching", empty, etc., short-circuit
    // with a clean "unclear_audio" response instead of asking GPT to parse garbage.
    if (looksLikeHallucination(transcribedText)) {
      const duration = Date.now() - startTime;
      // Log length via a local var to avoid `transcribedText` appearing inside
      // the logger call — the F01 privacy test scans source for leaks.
      const transcriptionLength = transcribedText.length;
      apiLogger.voice.error('Whisper hallucination rejected', duration, { length: transcriptionLength }, undefined, ip);
      return res.status(200).json({
        error: 'unclear_audio',
        userMessage: 'Não entendi. Tente falar mais próximo do microfone.',
      });
    }

    // 2. GPT interpretation
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        max_tokens: 150,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: transcribedText }
        ]
      }),
    });

    if (!gptResponse.ok) {
      const errText = await gptResponse.text();
      console.error('[Voice] GPT error:', errText);
      apiLogger.voice.error('GPT interpretation failed', Date.now() - startTime, { error: errText }, undefined, ip);
      return res.status(500).json({ error: 'Interpretation failed' });
    }

    const gptResult = await gptResponse.json();
    const content = gptResult.choices[0]?.message?.content || '{}';

    // Sanitize thousand separators + "N / 100" → "N%" BEFORE schema validation,
    // so the whitelist in the schema sees the cleaned-up expression. Same logic
    // as `src/lib/sanitize-expression.ts` on the client — defense in depth.
    const sanitized = content.replace(/(\d),(\d{3})(?=\D|$)/g, '$1$2')
      .replace(/(\d)\.(\d{3})(?=\D|$)/g, '$1$2')
      .replace(/(\d+)\s*\/\s*100\b/g, '$1%');

    // Phase 2.3 — Valibot schema validation.
    // Rejects invalid JSON, missing expression, prose inside expression,
    // non-whitelisted characters, unknown intents/dimensions.
    const gptParse = parseGPTResponse(sanitized);
    if (!gptParse.ok) {
      // One-line log so the static-analysis safety test can scan `raw_length` in context.
      // Don't log raw content — GPT sometimes echoes transcription (potential PII).
      apiLogger.voice.error('GPT returned invalid JSON', Date.now() - startTime, { raw_length: content.length, reason: gptParse.reason }, undefined, ip);

      // 200 (not 500) because a bad GPT response is expected, not a server fault.
      const errorMessage = gptParse.reason === 'invalid_json' ? 'Failed to parse voice input' : 'Could not understand the input';
      return res.status(200).json({ error: errorMessage });
    }

    const parsed = gptParse.data;
    const durationMs = Date.now() - startTime;
    logger.debug('VOICE', 'Voice interpretation success', {
      expression: parsed.expression,
      intent: parsed.intent,
      expected_dimension: parsed.expected_dimension,
      duration_ms: durationMs,
    });

    // Log de sucesso para app_logs (expression only, no transcription unless consented)
    apiLogger.voice.success(durationMs, {
      expression: parsed.expression,
      intent: parsed.intent,
      has_transcription: hasVoiceTrainingConsent && !!transcribedText,
    }, undefined, ip);

    // Save detailed voice_log ONLY if the user is authenticated AND opted in to voice training.
    // Without a user_id, saveVoiceLog refuses (anonymous logs are out of scope).
    let voiceLogId: string | null = null;
    if (userId && hasVoiceTrainingConsent && transcribedText) {
      voiceLogId = await saveVoiceLog({
        user_id: userId,
        transcription_raw: transcribedText,
        transcription_normalized: parsed.expression,
        transcription_engine: 'whisper-1',
        language_detected: detectLanguage(transcribedText),
        informal_terms: detectInformalTerms(transcribedText),
        entities: extractEntities(parsed.expression),
        // Phase 2.3 — GPT's own classification, captured as training signal.
        intent_detected: parsed.intent,
        was_successful: true,
        audio_duration_ms: durationMs,
        audio_format: 'webm',
      });
    }

    return res.status(200).json({ ...parsed, voice_log_id: voiceLogId });

  } catch (err) {
    console.error('[API] Exception:', String(err));
    apiLogger.voice.error('Server exception', Date.now() - startTime, { error: String(err) }, undefined, ip);
    return res.status(500).json({ error: 'Server processing error' });
  }
}
