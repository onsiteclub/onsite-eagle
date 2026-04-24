// src/parser/index.ts
// Deterministic free-text parser for PT/EN construction phrases.
//
// Goal: translate a natural-language phrase into an engine-consumable
// expression string — the same output Whisper + GPT will emit once voice
// ships. Pure logic, zero I/O, zero LLM.
//
// Pipeline (deterministic; each step is a pure string transformation):
//   1. Normalize (lowercase, strip accents, collapse whitespace)
//   2. Substitute fraction phrases — "três quartos" → "3/4"
//   3. Substitute operator phrases — "dividido por" → "/"
//   4. Substitute number words — "vinte" → "20", "dez" → "10"
//   5. Collapse "TENS e UNITS" — "20 e 5" → "25"
//   6. Collapse "INT e FRAC" mixed numbers — "3 e 1/2" → "3 1/2"
//   7. Substitute unit words — "pés" → "'", "polegadas" → "\""
//   8. Substitute percent words — "por cento" → "%"
//   9. Pattern: "X% de Y" → "Y * X%"
//  10. Pattern: "N por/by M" → "N * M" (multiplication shorthand)
//  11. Strip filler — "de", "da", "the", "a área de", "o volume de"
//  12. Collapse whitespace; validate; return.

import {
  UNIT_MAP,
  OPERATOR_PHRASES,
  NUMBER_WORDS,
  FRACTION_WORDS,
  PERCENT_WORDS,
} from './tables';
import type { ParseResult } from './types';

const MAX_INPUT_LENGTH = 200;

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** Lowercase + strip diacritics + normalize whitespace + common punctuation.
 *  Keeps engine-significant characters intact (' " / . , + - * % etc). */
function normalize(input: string): string {
  let s = input.toLowerCase().trim();
  // Strip combining diacritics (NFD → remove combining marks → NFC).
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
  // Decimal comma → dot (PT number format: "3,5" → "3.5").
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  // Collapse any whitespace run to a single space.
  s = s.replace(/\s+/g, ' ');
  return s;
}

// ---------------------------------------------------------------------------
// Word-boundary replacement helpers
// ---------------------------------------------------------------------------

/** Escape regex metacharacters in a literal phrase. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace every occurrence of a phrase, matching on whitespace/string bounds.
 *  We don't use `\b` because it fails on accented chars and on our custom
 *  tokens like "'" or "\"". */
function replacePhrase(haystack: string, phrase: string, replacement: string): string {
  const esc = escapeRegex(phrase);
  // Bound = start/end of string or a non-letter non-digit char.
  const re = new RegExp(`(^|[^a-z0-9])${esc}(?=$|[^a-z0-9])`, 'g');
  return haystack.replace(re, (_m, pre) => `${pre}${replacement}`);
}

/** Apply a lookup table as longest-phrase-first substitutions. Ensures
 *  "vinte e cinco" isn't eaten by the "vinte" entry before we see the whole. */
function applyTable(
  input: string,
  table: ReadonlyArray<readonly [string, string]>,
): string {
  const sorted = [...table].sort((a, b) => b[0].length - a[0].length);
  let out = input;
  for (const [phrase, replacement] of sorted) {
    out = replacePhrase(out, phrase, replacement);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Number-word substitution (separate from applyTable — numbers replace as digits)
// ---------------------------------------------------------------------------

function substituteNumberWords(input: string): string {
  const sorted = [...NUMBER_WORDS].sort((a, b) => b[0].length - a[0].length);
  let out = input;
  for (const [word, digit] of sorted) {
    out = replacePhrase(out, word, String(digit));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Compound number collapsing
// ---------------------------------------------------------------------------

/** "20 e 5" (from "vinte e cinco") → "25". Only when `tens` is a multiple of
 *  10 in [20,90] and `units` in [1,9]. Leaves unrelated additions alone. */
function collapseTensAndUnits(input: string): string {
  return input.replace(/\b([2-9])0\s+e\s+([1-9])\b/g, '$1$2');
}

/** "3 e 1/2" → "3 1/2" (mixed number). The engine's tokenizer reads that as
 *  a single value (3.5 inches). We only rewrite when the right side is a
 *  bare fraction like 1/2, 3/4 — keeps "5 e 7" (addition) intact. */
function collapseMixedNumbers(input: string): string {
  return input.replace(/\b(\d+)\s+e\s+(\d+\/\d+)\b/g, '$1 $2');
}

// ---------------------------------------------------------------------------
// Pattern: percentage of a base
// ---------------------------------------------------------------------------

/** "20% de 150" / "20% of 150" → "150 * 20%". Engine's percentage handler
 *  accepts `N * M%` directly. */
function rewritePercentOf(input: string): string {
  return input.replace(
    /(\d+(?:\.\d+)?)\s*%\s*(?:de|of)\s+(\d+(?:\.\d+)?)/g,
    '$2 * $1%',
  );
}

// ---------------------------------------------------------------------------
// Pattern: "N por M" / "N by M" → "N * M"
// ---------------------------------------------------------------------------

/** Handles the area/volume shorthand ("12 por 8", "12 by 8"). Runs AFTER
 *  operator-phrase substitution so "dividido por" has already become "/".
 *  Also handles unit-carrying forms like "12' por 8'" → "12' * 8'". */
function rewriteByMultiplication(input: string): string {
  // Match: number (optionally followed by ' or " or metric unit, with optional
  // whitespace — unit substitution emits "12 '" with a space) + "por"/"by" +
  // number. The "\\s*" before ['"] matters: our unit table produces the
  // apostrophe/quote separated by a space from the digit.
  const NUM_WITH_UNIT = `\\d+(?:\\.\\d+)?(?:\\s+\\d+\\/\\d+)?(?:\\s*['"]|\\s*(?:cm|mm|m)\\b)?`;
  const re = new RegExp(`(${NUM_WITH_UNIT})\\s+(?:por|by)\\s+(${NUM_WITH_UNIT})`, 'g');
  let prev: string;
  let out = input;
  // Run to fixed point so "12 por 8 por 3" (volume) collapses.
  do {
    prev = out;
    out = out.replace(re, '$1 * $2');
  } while (out !== prev);
  return out;
}

// ---------------------------------------------------------------------------
// Filler removal
// ---------------------------------------------------------------------------

const FILLER_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // "(a) área de", "(o) volume de" — the dimension is inferred by units anyway,
  // so these phrases are pure noise to the engine. Article is optional because
  // real users drop it ("área de 12 por 8" is just as common as "a área de ...").
  [/\b(?:a\s+|o\s+)?(?:area|volume|comprimento|altura|largura)\s+de\s+/g, ''],
  [/\b(?:the\s+)?(?:area|volume|length|height|width)\s+of\s+/g, ''],
  // Standalone "de"/"of" (left over when patterns above didn't match).
  [/(^|\s)(?:de|do|da|of|the)\s/g, '$1'],
];

function stripFiller(input: string): string {
  let out = input;
  for (const [re, repl] of FILLER_PATTERNS) {
    out = out.replace(re, repl);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Final validation
// ---------------------------------------------------------------------------

/** The engine needs at least one digit; otherwise we've been handed something
 *  the parser couldn't understand. */
function hasDigit(s: string): boolean {
  return /\d/.test(s);
}

/** Rejects common noise that slips past earlier phases (URLs, leftover words). */
function looksLikeGarbage(s: string): boolean {
  if (/https?:|www\./.test(s)) return true;
  // Letter runs of 3+ that aren't recognized units — probably unparsed words.
  // Allow cm, mm, m (our metric pass-throughs).
  const withoutUnits = s.replace(/\b(?:cm|mm|m)\b/g, '');
  if (/[a-z]{3,}/.test(withoutUnits)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a free-text phrase into an engine-ready expression string.
 *
 * @example
 *   parseExpression('dez pés mais três polegadas')
 *   // → { ok: true, expression: "10 ' + 3 \"" }
 *   parseExpression('20% de 150')
 *   // → { ok: true, expression: "150 * 20%" }
 *   parseExpression('banana')
 *   // → { ok: false, reason: '...', suggestion: '...' }
 */
export function parseExpression(input: string): ParseResult {
  if (!input || !input.trim()) {
    return { ok: false, reason: 'Entrada vazia.' };
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      reason: `Entrada muito longa (máximo ${MAX_INPUT_LENGTH} caracteres).`,
    };
  }

  let s = normalize(input);

  // 2. fraction phrases  (longest-match first via sort)
  s = applyTable(s, FRACTION_WORDS);
  // 3. operator phrases
  s = applyTable(s, OPERATOR_PHRASES);
  // 4. percent words — MUST run before number-word substitution, otherwise
  //    "cento" (100) in NUMBER_WORDS would eat the "cento" in "por cento"
  //    before we see the whole phrase.
  for (const word of PERCENT_WORDS) {
    s = replacePhrase(s, word, '%');
  }
  // 5. number words
  s = substituteNumberWords(s);
  // 6–7. compound numbers
  s = collapseTensAndUnits(s);
  s = collapseMixedNumbers(s);
  // 8. units
  s = applyTable(s, UNIT_MAP);
  // 9. percentage-of pattern
  s = rewritePercentOf(s);
  // 11. filler (run BEFORE "by" pattern so "área de 12 por 8" has its
  //     prefix stripped and we see "12 por 8").
  s = stripFiller(s);
  // 10. multiplication shorthand
  s = rewriteByMultiplication(s);
  // 12. cleanup
  s = s.replace(/\s+/g, ' ').trim();

  if (!hasDigit(s)) {
    return {
      ok: false,
      reason: 'Não encontrei nenhum número.',
      suggestion: 'Tente incluir um número — ex: "10 pés mais 3 polegadas".',
    };
  }
  if (looksLikeGarbage(s)) {
    return {
      ok: false,
      reason: `Não entendi "${input}".`,
      suggestion: 'Tente algo como "10 pés mais 3 polegadas" ou "20% de 150".',
    };
  }

  return { ok: true, expression: s };
}
