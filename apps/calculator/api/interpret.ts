// api/interpret.ts
// Voice-to-Expression API - Whisper + GPT-4o
// Vercel Serverless Function

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  canCollectVoice,
  saveVoiceLog,
  extractEntities,
  detectInformalTerms,
  detectLanguage,
  type VoiceLogRecord,
} from './lib/voice-logs.js';
import { apiLogger } from './lib/api-logger.js';

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

// CORS - Domínios permitidos
const ALLOWED_ORIGINS = [
  'https://calculator.onsiteclub.ca',
  'https://app.onsiteclub.ca',
  'https://onsiteclub-calculator.vercel.app',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost:5173',
  'http://localhost:3000',
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) return true;
  // Allow all Vercel preview deployments
  if (origin.includes('.vercel.app')) return true;
  return false;
}

// Rate limiting simples
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  const recent = requests.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);

  if (rateLimitMap.size > 10000) {
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.every(t => now - t > RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(key);
      }
    }
  }

  return true;
}

// System prompt para GPT - SPEC V9 (tabela completa de unidades + variações multilíngue)
const SYSTEM_PROMPT = `You are a parser for a construction calculator.
Convert spoken phrases into mathematical expressions.
Return ONLY valid JSON: {"expression":"..."}

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
- Noise: "mil" (dangerous - could be thousand), "double m"

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
"dos por cuatro" → {"expression":"2x4"}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>);

  // CORS
  const origin = req.headers.origin || '';
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (!checkRateLimit(ip)) {
    console.error('[API] Rate limited:', ip);
    apiLogger.voice.rateLimited(ip);
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

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
    let userId: string | undefined;

    for (const part of parts) {
      // Extract user_id field if present
      if (part.includes('name="user_id"')) {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const content = part.slice(headerEnd + 4).trim();
          userId = content.replace(/\r\n--$/, '').replace(/--\r\n$/, '').trim();
        }
      }

      if (part.includes('filename=')) {
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (filenameMatch) filename = filenameMatch[1];

        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const content = part.slice(headerEnd + 4);
          const cleanContent = content.replace(/\r\n--$/, '').replace(/--\r\n$/, '');
          audioData = Buffer.from(cleanContent, 'binary');
        }
      }
    }

    if (!audioData || audioData.length === 0) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // 1. Whisper transcription
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioData)], { type: 'audio/webm' });
    formData.append('file', audioBlob, filename);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('prompt', 'Construction measurements: inches, feet, yards, millimeters, centimeters, meters. Fractions: half, quarter, eighth, 1/2, 3/8, 1/4, 5/8, 7/8. Portuguese: polegada, pé, metro, milímetro, centímetro, meio, quarto, oitavo, mais, menos, vezes, dividido, ponto. Informal: incha, inchas, fit, fiti, fits, mai, meno, mili, haf, haff. Spanish: pulgada, pie, yarda, metro, medio, cuarto, punto, por. Lumber dimensions: two by four. Mixed multilingual speech.');

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
      apiLogger.voice.error('Whisper transcription failed', Date.now() - startTime, { error: errText }, userId, ip);
      return res.status(500).json({ error: 'Transcription failed' });
    }

    const whisperResult = await whisperResponse.json();
    const transcribedText = whisperResult.text;

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
      console.error('[Voice] GPT error:', errText, 'transcription:', transcribedText);
      apiLogger.voice.error('GPT interpretation failed', Date.now() - startTime, { error: errText, transcription: transcribedText }, userId, ip);
      return res.status(500).json({ error: 'Interpretation failed' });
    }

    const gptResult = await gptResponse.json();
    const content = gptResult.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const durationMs = Date.now() - startTime;
    console.log('[Voice] Success:', { transcription: transcribedText, expression: parsed.expression, duration_ms: durationMs });

    // Log de sucesso para app_logs
    apiLogger.voice.success(durationMs, { transcription: transcribedText, expression: parsed.expression }, userId, ip);

    // 3. Salvar voice_log se usuário tiver consentimento
    let voiceLogId: string | null = null;
    console.log('[Voice] Checking voice_log save - userId:', userId);
    if (userId) {
      const hasConsent = await canCollectVoice(userId);
      console.log('[Voice] canCollectVoice result:', hasConsent, 'for userId:', userId);
      if (hasConsent) {
        const voiceLog: VoiceLogRecord = {
          user_id: userId,
          feature_context: 'main_calculator',
          audio_format: 'webm',
          transcription_raw: transcribedText,
          transcription_normalized: parsed.expression,
          transcription_engine: 'whisper-1',
          language_detected: detectLanguage(transcribedText),
          intent_detected: 'calculate',
          intent_fulfilled: !!parsed.expression,
          entities: extractEntities(parsed.expression || ''),
          informal_terms: detectInformalTerms(transcribedText),
          was_successful: !!parsed.expression,
        };

        voiceLogId = await saveVoiceLog(voiceLog);
        if (voiceLogId) {
          console.log('[Voice] Saved voice_log:', voiceLogId);
        }
      }
    }

    return res.status(200).json({
      ...parsed,
      voice_log_id: voiceLogId, // Retornar ID para vincular ao calculation
    });

  } catch (err) {
    console.error('[API] Exception:', String(err));
    apiLogger.voice.error('Server exception', Date.now() - startTime, { error: String(err) }, undefined, ip);
    return res.status(500).json({ error: 'Server processing error' });
  }
}
