// api/lib/voice-guards.ts
// Phase 2.2 + 2.3 — defensive filters between Whisper and GPT, and schema
// validation between GPT and the engine. Exported as pure functions so they
// can be unit-tested without spinning up the whole Vercel handler.

import * as v from 'valibot';

// ---------------------------------------------------------------------------
// 2.2 — Anti-hallucination guard
// ---------------------------------------------------------------------------

/**
 * Whisper sometimes fills silence or noise with tokens from its training
 * distribution: URLs, email addresses, "thanks for watching" / "subscribe",
 * or near-empty strings. These are always wrong for a construction calculator.
 * Returning `true` short-circuits the pipeline with a user-facing "unclear
 * audio" message instead of feeding garbage to GPT.
 */
export function looksLikeHallucination(text: string): boolean {
  const s = text.toLowerCase().trim();
  if (s.length < 2) return true;
  if (/^[\s.,!?-]*$/.test(s)) return true;

  // URLs and email addresses — never part of a calculation.
  if (/https?:\/\/|www\.|\.com|\.ca|\.org|\.net|\.io|\.br/i.test(s)) return true;
  if (/@\w+\.\w+/.test(s)) return true;

  // Known Whisper stock phrases across the languages we see in production.
  const stockPhrases = [
    'thanks for watching',
    'thank you for watching',
    'obrigado por assistir',
    'obrigada por assistir',
    'subscribe',
    'like and subscribe',
    'like share subscribe',
    'merci de regarder',
    'gracias por ver',
    'please subscribe',
    'check the description',
    'link in the description',
  ];
  return stockPhrases.some((p) => s.includes(p));
}

// ---------------------------------------------------------------------------
// 2.3 — GPT response schema
// ---------------------------------------------------------------------------

/**
 * Whitelist for the `expression` field. The engine accepts:
 *   digits, optional decimal point, whitespace,
 *   operators (+ - * / × ÷ %), parentheses, feet/inch quotes,
 *   fraction slash (already covered by `/`),
 *   unit tokens (sqft/sqin/cuft/cuin/mm/cm/m/yd/ft/in and `x` for lumber dims).
 *
 * Anything outside this alphabet — prose, URLs, GPT hallucinating an
 * explanation inside the expression — is rejected.
 */
const UNITS = '(sqft|sqin|cuft|cuin|sqm|cum|mm|cm|m|yd|ft|in|x|×|÷)';
// Accept a sequence of tokens: number (optional decimal), operator, quote, fraction, unit token, or whitespace.
const EXPR_CHARS = new RegExp(`^(\\d+(?:\\.\\d+)?|[\\s+\\-*/()%'"×÷]|${UNITS})+$`, 'i');

// Phase 4.1 — parameters payload per intent. Loose shape (record of string → primitive)
// because each intent has its own keys. The engine doesn't trust these — it validates
// them semantically in the relevant sub-module (stairs.ts, triangle.ts, etc.).
const PRIMITIVE = v.union([v.string(), v.number(), v.boolean()]);
const ParametersSchema = v.record(v.string(), PRIMITIVE);

export const GPTResponseSchema = v.object({
  // Source of truth — the math string the engine will parse.
  expression: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1),
    v.maxLength(100),
    v.regex(EXPR_CHARS, 'Expressão contém caracteres não permitidos'),
  ),

  // Optional hint fields — we don't enforce them, but we shape-check them
  // so bad payloads are rejected early instead of silently ignored.
  intent: v.optional(
    v.picklist([
      'calculation',
      'area',
      'volume',
      'conversion',
      'stairs',
      'triangle',
      'unclear',
    ]),
  ),
  expected_dimension: v.optional(
    v.picklist(['scalar', 'length', 'area', 'volume']),
  ),
  explanation_pt: v.optional(v.pipe(v.string(), v.maxLength(200))),
  // Phase 4.1 — per-intent structured parameters. Mode-aware consumers (stairs
  // panel, triangle panel, converter) read the keys they need, ignore the rest.
  parameters: v.optional(ParametersSchema),
});

export type GPTResponse = v.InferOutput<typeof GPTResponseSchema>;

/**
 * Parse + validate GPT's raw text output.
 * Returns `{ ok: true, data }` on success, or `{ ok: false, reason }` on any
 * parse/shape failure so callers can short-circuit with a clean error.
 */
export function parseGPTResponse(
  raw: string,
): { ok: true; data: GPTResponse } | { ok: false; reason: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  const parsed = v.safeParse(GPTResponseSchema, json);
  if (!parsed.success) {
    // Surface the first issue's path for telemetry; the user-facing error stays generic.
    const first = parsed.issues[0];
    const path = first?.path?.map((p) => String((p as { key?: string }).key ?? '')).join('.') ?? '';
    return {
      ok: false,
      reason: path ? `schema_${path}` : 'schema_invalid',
    };
  }
  return { ok: true, data: parsed.output };
}
