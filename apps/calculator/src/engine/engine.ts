// src/engine/engine.ts
// Engine v2.1 — visor-driven contract per cenarios-visor-calculadora-onsite-v3.html.
//
// What changed from v2:
//   - Result shape is now {primary, secondary, isError, errorKind, ...} instead
//     of the flat legacy {displayPrimary, resultFeetInches, isInchMode, ...}.
//   - mixedSystems flag detected during token extraction; switches the dual
//     visor labels from "sq ft / m²" to "imperial / métrico" when dim === 1.
//   - originalUnit travels with each Quantity so display can preserve the
//     user's input scale (Vol 4.4: keep mm, keep cm, scale to m at ≥ 100 cm).
//   - Error catch is funneled through specific EngineError kinds, so the
//     visor can show "divisão por zero" instead of generic "Error".
//   - Expression armação is normalized to unicode operators (× ÷ −).
//   - Thousand separator + decimal mark applied per locale (PT-BR by default).
//
// Architecture (5 stages — same skeleton as v2)
//   1. Preprocess   — unicode/dash/thousand/comma normalization
//   2. Guard        — reject consecutive binary operators
//   3. Extract      — scan construction tokens, replace with __v{i}, capture
//                     value + dim + originalUnit + system → context map
//   4. Parse        — expr-eval validates syntax (parens, unary, malformed)
//   5. Evaluate     — walk RPN with Fraction ops + dim/system tracking

import Fraction from 'fraction.js';
import { Parser as ExprEvalParser } from 'expr-eval';
import type {
  CalculationResult,
  DimensionType,
  Dim,
  OriginalUnit,
  System,
  EngineErrorKind,
  VisorSide,
} from './types';

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/** A number with its dimension AND provenance metadata. The provenance
 *  (original unit + system) drives display formatting at the boundary. */
interface Quantity {
  value: Fraction;
  dim: Dim;
  /** What unit the user typed. null when the operand was a bare scalar
   *  (no unit marker), or when an arithmetic op merged operands of
   *  different units and there's no clear winner. */
  originalUnit: OriginalUnit;
  /** imperial when ', ", ft, in were present; metric when mm, cm, m. null
   *  for bare scalars. Used to track mixedSystems flag. */
  system: System | null;
}

function dimName(d: Dim): DimensionType {
  return (['scalar', 'length', 'area', 'volume'] as const)[d];
}

class EngineError extends Error {
  constructor(public kind: EngineErrorKind, message: string, public position: number | null = null) {
    super(message);
    this.name = 'EngineError';
  }
}

// ============================================================================
// LOCALE — separator + decimal mark per device
// ============================================================================

interface LocaleFormat {
  /** Character between groups of 3 in the integer part. */
  thousand: string;
  /** Character separating integer and fractional parts. */
  decimal: string;
}

/** Detect device locale at module load. Defaults to PT-BR (project's primary
 *  market) when navigator is unavailable (SSR / native shell warmup). */
function detectLocale(): LocaleFormat {
  let lang = 'pt-BR';
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      lang = navigator.language;
    }
  } catch {
    // ignore
  }
  // English locales use comma-thousand + dot-decimal; everyone else (PT, ES,
  // FR, DE) tends to use dot-thousand + comma-decimal.
  if (/^en\b/i.test(lang)) {
    return { thousand: ',', decimal: '.' };
  }
  return { thousand: '.', decimal: ',' };
}

const LOCALE = detectLocale();

// ============================================================================
// PREPROCESSING
// ============================================================================

/** Normalize unicode operators, handle dash-separated feet-inches, resolve PT
 *  decimal comma and US thousand separators. Returns the form passed to the
 *  tokenizer. (Distinct from the *display* normalization done by `armar`.) */
function preprocess(input: string): string {
  let s = input.trim();
  // Unicode → ASCII for parser. We re-uplift to unicode in `armar` for display.
  s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  // Dash IMMEDIATELY between feet marker and inches is notation, not
  // subtraction. Require zero whitespace around the dash so explicit
  // subtraction like `2' - 3'` continues to mean subtraction.
  s = s.replace(/(\d)'-(\d)/g, "$1' $2");
  // Thousand separators: digit comma exactly-3-digits, not followed by digit.
  s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  // PT decimal comma: digit comma digit (after thousand stripping).
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  s = s.replace(/[\t\n\r]+/g, ' ').replace(/ {2,}/g, ' ');
  return s;
}

// Reject double binary operators. Unary minus after binary is fine.
function rejectConsecutiveBinary(s: string): void {
  if (/[+\-*/]\s*[+*/]/.test(s)) {
    throw new EngineError('duplicate_operators', 'operadores duplicados');
  }
}

// ============================================================================
// CONSTRUCTION TOKEN EXTRACTION
// ============================================================================

const APOS = "'";
const QUOTE = '"';
const CT_PATTERN =
  '\\b\\d+(?:\\.\\d+)?\\s*' + APOS + '\\s*\\d+\\s+\\d+/\\d+\\s*' + QUOTE + '?' +
  '|\\b\\d+(?:\\.\\d+)?\\s*' + APOS + '\\s*\\d+/\\d+\\s*' + QUOTE + '?' +
  '|\\b\\d+(?:\\.\\d+)?\\s*' + APOS + '\\s*\\d+\\s*' + QUOTE + '?' +
  '|\\b\\d+(?:\\.\\d+)?\\s*' + APOS +
  '|\\b\\d+\\s+\\d+/\\d+\\s*' + QUOTE + '?' +
  '|\\b\\d+/\\d+\\s*' + QUOTE + '?' +
  '|\\b\\d+(?:\\.\\d+)?\\s*' + QUOTE +
  // Metric: digit + optional decimal + space? + (mm|cm|m as whole word)
  '|\\b\\d+(?:\\.\\d+)?\\s*(?:mm|cm|m)\\b' +
  // Imperial unit names: ft / in / yd as whole word
  '|\\b\\d+(?:\\.\\d+)?\\s*(?:ft|in|yd)\\b' +
  // Area / volume explicit units (sq ft, sq m, cu ft, cu m, sqft, etc.)
  '|\\b\\d+(?:\\.\\d+)?\\s*(?:sq\\s*ft|sqft|sq\\s*m|sqm|cu\\s*ft|cuft|cu\\s*m|cum)\\b';
const CONSTRUCTION_TOKEN = new RegExp(CT_PATTERN, 'gi');

/** Detect what unit the raw token carries. Order matters — area/volume words
 *  must match before bare metric/imperial. */
function detectOriginalUnit(raw: string): { unit: OriginalUnit; dim: Dim; system: System | null } {
  const r = raw.trim();
  // Area first
  if (/\bsq\s*ft\b|\bsqft\b/i.test(r)) return { unit: 'sqft', dim: 2, system: 'imperial' };
  if (/\bsq\s*m\b|\bsqm\b/i.test(r)) return { unit: 'sqm', dim: 2, system: 'metric' };
  // Volume
  if (/\bcu\s*ft\b|\bcuft\b/i.test(r)) return { unit: 'cuft', dim: 3, system: 'imperial' };
  if (/\bcu\s*m\b|\bcum\b/i.test(r)) return { unit: 'cum', dim: 3, system: 'metric' };
  // Length imperial — ', "'s, foot/inch words
  if (/'/.test(r) || /\bft\b/i.test(r)) return { unit: 'ft', dim: 1, system: 'imperial' };
  if (/"/.test(r) || /\bin\b/i.test(r)) return { unit: 'in', dim: 1, system: 'imperial' };
  // Bare fraction without unit defaults to inches per construction convention.
  if (/\d+\/\d+/.test(r)) return { unit: 'in', dim: 1, system: 'imperial' };
  // Length metric — order matters: mm and cm before bare m
  if (/\bmm\b/i.test(r)) return { unit: 'mm', dim: 1, system: 'metric' };
  if (/\bcm\b/i.test(r)) return { unit: 'cm', dim: 1, system: 'metric' };
  if (/\bm\b/i.test(r)) return { unit: 'm', dim: 1, system: 'metric' };
  // Pure scalar
  return { unit: null, dim: 0, system: null };
}

/** Convert a construction token into a Fraction expressed in the canonical
 *  base for its dim — inches for length, sq inches for area, cu inches for
 *  volume. Stores nothing about original unit; caller pairs that separately. */
function parseConstructionToken(raw: string): Fraction {
  let s = raw.trim().replace(/"/g, '').trim();

  // Strip area/volume keywords first so the numeric core can be isolated.
  s = s.replace(/\bsq\s*ft\b|\bsqft\b/gi, '').trim();
  s = s.replace(/\bsq\s*m\b|\bsqm\b/gi, '').trim();
  s = s.replace(/\bcu\s*ft\b|\bcuft\b/gi, '').trim();
  s = s.replace(/\bcu\s*m\b|\bcum\b/gi, '').trim();

  // Trailing imperial unit word (ft / in / yd).
  let imperialMul = new Fraction(1);
  if (/\bft\b/i.test(s)) { imperialMul = new Fraction(12); s = s.replace(/\bft\b/i, '').trim(); }
  else if (/\bin\b/i.test(s)) { s = s.replace(/\bin\b/i, '').trim(); }
  else if (/\byd\b/i.test(s)) { imperialMul = new Fraction(36); s = s.replace(/\byd\b/i, '').trim(); }

  // Trailing metric unit. We store length canonically in millimeters when
  // input was metric — keeps everything as fraction.js BigInt rationals.
  // Wait: better — convert to inches so dim arithmetic stays uniform across
  // systems. 1 mm = 1/25.4 in; 1 cm = 1/2.54 in; 1 m = 1000/25.4 in.
  let metricToIn = new Fraction(1);
  if (/\bmm\b/i.test(s)) { metricToIn = new Fraction(1, 1).div(new Fraction(254, 10)); s = s.replace(/\bmm\b/i, '').trim(); }
  else if (/\bcm\b/i.test(s)) { metricToIn = new Fraction(1, 1).div(new Fraction(254, 100)); s = s.replace(/\bcm\b/i, '').trim(); }
  else if (/\bm\b/i.test(s)) { metricToIn = new Fraction(1000).div(new Fraction(254, 10)); s = s.replace(/\bm\b/i, '').trim(); }

  let totalInches = new Fraction(0);

  if (s.includes("'")) {
    const apo = s.indexOf("'");
    const feetStr = s.slice(0, apo).trim();
    const rest = s.slice(apo + 1).trim();
    if (!/^\d+(?:\.\d+)?$/.test(feetStr)) {
      throw new EngineError('malformed_number', `número inválido: ${feetStr}`);
    }
    totalInches = new Fraction(feetStr).mul(12);
    s = rest;
  }

  // Multiplier when an imperial unit word was attached (ft, yd).
  const applyImperialMul = (f: Fraction) => f.mul(imperialMul);
  const applyMetricMul = (f: Fraction) => f.mul(metricToIn);

  if (!s) return applyImperialMul(applyMetricMul(totalInches));

  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const [, whole, num, den] = mixed;
    if (den === '0') throw new EngineError('malformed_number', 'denominador zero');
    const v = totalInches.add(new Fraction(whole)).add(new Fraction(+num, +den));
    return applyImperialMul(applyMetricMul(v));
  }

  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const num = +frac[1];
    const den = +frac[2];
    if (den === 0) throw new EngineError('malformed_number', 'denominador zero');
    // Improper bare fractions are accepted (mathematically valid: 3/2 = 1.5).
    // The visor formatter renders them as a mixed number when |v| ≥ 1.
    return applyImperialMul(applyMetricMul(totalInches.add(new Fraction(num, den))));
  }

  if (!/^\d+(?:\.\d+)?$/.test(s)) {
    throw new EngineError('malformed_number', `número inválido: ${s}`);
  }
  return applyImperialMul(applyMetricMul(totalInches.add(new Fraction(s))));
}

// ============================================================================
// QUANTITY ALGEBRA
// ============================================================================

function mulQ(a: Quantity, b: Quantity): Quantity {
  const newDim = a.dim + b.dim;
  if (newDim > 3) throw new EngineError('dimension_mismatch', 'dimensão acima de volume');
  const system = mergeSystem(a.system, b.system);
  const originalUnit = mergeUnitForMul(a.originalUnit, b.originalUnit, newDim as Dim);
  return { value: a.value.mul(b.value), dim: newDim as Dim, originalUnit, system };
}

function divQ(a: Quantity, b: Quantity): Quantity {
  if (b.value.equals(0)) throw new EngineError('division_by_zero', 'divisão por zero');
  const newDim = a.dim - b.dim;
  if (newDim < 0) throw new EngineError('dimension_mismatch', 'divisão produz dimensão negativa');
  const system = mergeSystem(a.system, b.system);
  return { value: a.value.div(b.value), dim: newDim as Dim, originalUnit: a.originalUnit, system };
}

function coerceForAddSub(a: Quantity, b: Quantity): [Quantity, Quantity] {
  if (a.dim === b.dim) return [a, b];
  if (a.dim === 0) return [{ ...a, dim: b.dim, originalUnit: b.originalUnit, system: b.system }, b];
  if (b.dim === 0) return [a, { ...b, dim: a.dim, originalUnit: a.originalUnit, system: a.system }];
  throw new EngineError('dimension_mismatch', `não posso somar ${dimName(a.dim)} com ${dimName(b.dim)}`);
}

function addQ(a: Quantity, b: Quantity): Quantity {
  const [l, r] = coerceForAddSub(a, b);
  const system = mergeSystem(l.system, r.system);
  const originalUnit = mergeUnitForAddSub(l.originalUnit, r.originalUnit);
  return { value: l.value.add(r.value), dim: l.dim, originalUnit, system };
}

function subQ(a: Quantity, b: Quantity): Quantity {
  const [l, r] = coerceForAddSub(a, b);
  const system = mergeSystem(l.system, r.system);
  const originalUnit = mergeUnitForAddSub(l.originalUnit, r.originalUnit);
  return { value: l.value.sub(r.value), dim: l.dim, originalUnit, system };
}

function negQ(a: Quantity): Quantity {
  return { ...a, value: a.value.neg() };
}

/** When two Quantities meet at a binary op, decide what `system` survives.
 *  null + S = S, S + S = S, S1 + S2 = mixed (encoded as null with the
 *  cumulative `mixedSystemsFlag` set elsewhere). */
function mergeSystem(a: System | null, b: System | null): System | null {
  if (a === b) return a;
  if (a == null) return b;
  if (b == null) return a;
  // a !== b and both non-null → mixed (will be handled at the result builder).
  return null;
}

/** Add/sub merging — keep the unit if both sides agree; otherwise pick the
 *  finer one (for display preservation per Vol 4). */
function mergeUnitForAddSub(a: OriginalUnit, b: OriginalUnit): OriginalUnit {
  if (a === b) return a;
  if (a == null) return b;
  if (b == null) return a;
  // Prefer the smaller unit on conflict so we don't lose precision in display.
  const order: OriginalUnit[] = ['mm', 'cm', 'in', 'm', 'ft', 'sqin', 'sqft', 'sqm', 'cuin', 'cuft', 'cum'];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai === -1 || bi === -1) return null;
  return ai <= bi ? a : b;
}

/** Mul merging — bumps to the area/volume slot of whichever system led the
 *  pair. Imperial dominates when present (the v3 spec defaults dim≥2 imperial
 *  results to sq ft / cu ft labels first). */
function mergeUnitForMul(a: OriginalUnit, b: OriginalUnit, newDim: Dim): OriginalUnit {
  if (newDim === 2) {
    if (a === 'ft' || b === 'ft' || a === 'in' || b === 'in' || a === 'sqft' || b === 'sqft') return 'sqft';
    if (a === 'm' || b === 'm' || a === 'cm' || b === 'cm' || a === 'mm' || b === 'mm' || a === 'sqm' || b === 'sqm') return 'sqm';
    return null;
  }
  if (newDim === 3) {
    if (a === 'ft' || b === 'ft' || a === 'in' || b === 'in' || a === 'sqft' || b === 'sqft' || a === 'cuft' || b === 'cuft') return 'cuft';
    if (a === 'm' || b === 'm' || a === 'cm' || b === 'cm' || a === 'mm' || b === 'mm' || a === 'sqm' || b === 'sqm' || a === 'cum' || b === 'cum') return 'cum';
    return null;
  }
  return mergeUnitForAddSub(a, b);
}

// ============================================================================
// FORMATTERS — number → string per visor rules
// ============================================================================

function formatLocaleDecimal(num: number, maxFractionDigits: number): string {
  if (!isFinite(num)) return 'Erro';
  const negative = num < 0;
  const abs = Math.abs(num);
  // Round to the requested precision, then split.
  const factor = Math.pow(10, maxFractionDigits);
  const rounded = Math.round(abs * factor) / factor;
  const isInt = Number.isInteger(rounded);
  const [intPart, fracPart] = (isInt ? String(rounded) : rounded.toFixed(maxFractionDigits)).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, LOCALE.thousand);
  const trimmedFrac = fracPart ? fracPart.replace(/0+$/, '') : '';
  const out = trimmedFrac ? `${grouped}${LOCALE.decimal}${trimmedFrac}` : grouped;
  return (negative ? '−' : '') + out;
}

/** Format a fraction for the scalar visor, returning value + isApproximate. */
function formatScalarFraction(f: Fraction): { display: string; isApproximate: boolean; exactForm: string | null } {
  const decimal = f.valueOf();
  const isInt = f.d === 1n || f.d === BigInt(1);
  if (isInt) {
    return { display: formatLocaleDecimal(decimal, 0), isApproximate: false, exactForm: null };
  }
  // Try to render as proper/improper fraction (Vol 2 rules).
  const abs = Math.abs(decimal);
  const sign = decimal < 0 ? '−' : '';
  // Improper but small denominator → mixed number (≥ 1) or simple fraction (< 1).
  // Convert through fraction.js for exact rendering.
  if (abs < 1) {
    return { display: `${sign}${f.abs().n}/${f.abs().d}`, isApproximate: false, exactForm: null };
  }
  // Mixed number: ≥ 1
  const whole = BigInt(f.abs().n) / BigInt(f.abs().d);
  const remainderN = BigInt(f.abs().n) - whole * BigInt(f.abs().d);
  if (remainderN === 0n) {
    return { display: formatLocaleDecimal(decimal, 0), isApproximate: false, exactForm: null };
  }
  return {
    display: `${sign}${whole} ${remainderN}/${f.abs().d}`,
    isApproximate: false,
    exactForm: null,
  };
}

/** Snap inches value to nearest 1/16" and return whole-inches + sixteenths.
 *  Returns isApproximate=true if rounding altered the underlying rational. */
function snapInchesToSixteenths(decimalInches: number): { whole: number; sixteenths: number; isApproximate: boolean } {
  const negative = decimalInches < 0;
  const abs = Math.abs(decimalInches);
  const totalSixteenths = Math.round(abs * 16);
  const whole = Math.floor(totalSixteenths / 16);
  const sixteenths = totalSixteenths - whole * 16;
  // True approximation only when the original wasn't already a clean 16th.
  const isApproximate = Math.abs(abs * 16 - totalSixteenths) > 1e-9;
  return { whole: negative ? -whole : whole, sixteenths, isApproximate };
}

function reduceFraction(numerator: number, denominator: number): { n: number; d: number } {
  if (numerator === 0) return { n: 0, d: 1 };
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(numerator, denominator);
  return { n: numerator / g, d: denominator / g };
}

/** Format an inches value as imperial display per Vol 3.
 *  - |v| < 12" → "8 3/4\"" (no feet)
 *  - |v| ≥ 12" → "5' 0\"" (always both parts; zero inches explicit)
 *  - Snap to 1/16"; flag isApproximate when rounding altered. */
function formatImperialLength(decimalInches: number): { display: string; isApproximate: boolean } {
  if (!isFinite(decimalInches)) return { display: 'Erro', isApproximate: false };

  const negative = decimalInches < 0;
  const absDec = Math.abs(decimalInches);
  const snap = snapInchesToSixteenths(absDec);
  const totalSixteenths = snap.whole * 16 + snap.sixteenths;
  const isApproximate = snap.isApproximate;

  // Branch on the SNAPPED value, not the raw decimal — otherwise a value like
  // 11.999" that rounds to 12 still enters the < 12 branch and renders "12""
  // instead of the spec-mandated "1' 0\"".
  if (totalSixteenths < 16 * 12) {
    const whole = Math.floor(totalSixteenths / 16);
    const sixteenths = totalSixteenths - whole * 16;
    if (sixteenths === 0) {
      const out = `${whole}"`;
      return { display: (negative ? '−' : '') + out, isApproximate };
    }
    const { n, d } = reduceFraction(sixteenths, 16);
    const wholePart = whole > 0 ? `${whole} ` : '';
    return { display: (negative ? '−' : '') + `${wholePart}${n}/${d}"`, isApproximate };
  }

  // ≥ 12" — feet-inches with zero inches always explicit.
  let feet = Math.floor(totalSixteenths / (16 * 12));
  const remainderSixteenths = totalSixteenths - feet * 16 * 12;
  let wholeInches = Math.floor(remainderSixteenths / 16);
  let sixteenths = remainderSixteenths - wholeInches * 16;
  if (sixteenths === 16) { sixteenths = 0; wholeInches += 1; }
  if (wholeInches === 12) { wholeInches = 0; feet += 1; }

  let inchesStr: string;
  if (sixteenths === 0) {
    inchesStr = `${wholeInches}"`;
  } else {
    const { n, d } = reduceFraction(sixteenths, 16);
    const wholePart = wholeInches > 0 ? `${wholeInches} ` : '';
    inchesStr = `${wholePart}${n}/${d}"`;
  }
  return { display: (negative ? '−' : '') + `${feet}' ${inchesStr}`, isApproximate };
}

/** Format an inches value as metric length per Vol 4.
 *  Uses originalUnit hint to preserve user's input scale where possible. */
function formatMetricLength(decimalInches: number, original: OriginalUnit): { display: string; isApproximate: boolean } {
  if (!isFinite(decimalInches)) return { display: 'Erro', isApproximate: false };
  const negative = decimalInches < 0;
  const abs = Math.abs(decimalInches);
  // Convert inches → millimeters as the smallest-grained common base.
  const mm = abs * 25.4;
  const sign = negative ? '−' : '';

  // Vol 4 rules:
  //   - input was mm → keep mm (regardless of magnitude, Vol 4.4)
  //   - input was cm and |v| < 100cm (1m) → keep cm
  //   - input was cm and |v| ≥ 100cm → scale to m with 2 decimals
  //   - input was m or no specific hint → m (with auto-decimals)
  if (original === 'mm') {
    return { display: `${sign}${formatLocaleDecimal(mm, 1)} mm`, isApproximate: Math.abs(mm - Math.round(mm * 10) / 10) > 1e-9 };
  }
  if (original === 'cm') {
    const cm = mm / 10;
    if (cm < 100) {
      return { display: `${sign}${formatLocaleDecimal(cm, 2)} cm`, isApproximate: false };
    }
    // ≥ 100 cm → display in meters
    const m = mm / 1000;
    return { display: `${sign}${formatLocaleDecimal(m, 2)} m`, isApproximate: false };
  }
  // Default (m or unknown): meters, drop trailing zeros.
  const m = mm / 1000;
  if (Number.isInteger(m)) {
    return { display: `${sign}${formatLocaleDecimal(m, 0)} m`, isApproximate: false };
  }
  return { display: `${sign}${formatLocaleDecimal(m, 2)} m`, isApproximate: false };
}

// ----------------------------------------------------------------------------
// Alt-notation builders for length results — give the user BOTH forms so the
// construction reader can switch between feet+inches and total inches (or
// metric mm/cm/m) at a glance, without having to mentally convert.
// ----------------------------------------------------------------------------

/** For an imperial length, return the OTHER notation as a secondary block.
 *  - Primary < 12" (inches form like `8 3/4"`) → secondary in decimal feet.
 *  - Primary ≥ 12" (feet+inches form) → secondary as total inches. */
function altImperialLength(decimalInches: number): VisorSide | null {
  if (decimalInches === 0) return null;
  const abs = Math.abs(decimalInches);
  if (abs >= 12) {
    // Total inches with fraction (e.g. "120 In", "97 1/2 In").
    return { value: formatTotalInches(decimalInches), unitLabel: null };
  }
  // Decimal feet — `0.73'`. Use the apostrophe so unit is unambiguous.
  const feet = decimalInches / 12;
  return { value: `${formatLocaleDecimal(feet, 3)}'`, unitLabel: null };
}

/** For a metric length, return the OTHER metric scale as a secondary block.
 *  - Primary in mm → secondary in cm (or m if very large).
 *  - Primary in cm (single-system, < 100cm) → secondary in mm.
 *  - Primary in m → secondary in cm. */
function altMetricLength(decimalInches: number, original: OriginalUnit): VisorSide | null {
  if (decimalInches === 0) return null;
  const negative = decimalInches < 0;
  const sign = negative ? '−' : '';
  const absMm = Math.abs(decimalInches) * 25.4;

  if (original === 'mm') {
    if (absMm < 1000) {
      return { value: `${sign}${formatLocaleDecimal(absMm / 10, 2)} cm`, unitLabel: null };
    }
    return { value: `${sign}${formatLocaleDecimal(absMm / 1000, 3)} m`, unitLabel: null };
  }
  if (original === 'cm') {
    const cm = absMm / 10;
    if (cm < 100) {
      return { value: `${sign}${formatLocaleDecimal(absMm, 0)} mm`, unitLabel: null };
    }
    return { value: `${sign}${formatLocaleDecimal(cm, 0)} cm`, unitLabel: null };
  }
  // Default (m or unknown): show cm as alt.
  return { value: `${sign}${formatLocaleDecimal(absMm / 10, 1)} cm`, unitLabel: null };
}

function formatAreaImperial(decimalSqIn: number): string {
  const sqft = decimalSqIn / 144;
  return formatLocaleDecimal(sqft, 2);
}

function formatAreaMetric(decimalSqIn: number): string {
  const sqm = decimalSqIn / (1550.0031);  // 1 sq m = 1550.0031 sq in
  return formatLocaleDecimal(sqm, 2);
}

function formatVolumeImperial(decimalCuIn: number): string {
  const cuft = decimalCuIn / 1728;
  return formatLocaleDecimal(cuft, 2);
}

function formatVolumeMetric(decimalCuIn: number): string {
  const cum = decimalCuIn / 61023.7441;  // 1 cu m = 61023.7441 cu in
  return formatLocaleDecimal(cum, 3);
}

// ============================================================================
// EXPRESSION ARMAÇÃO — input string → display-ready normalized form
// ============================================================================

/** Build the "armação" line shown above the result. Applies thousand
 *  separators per locale, swaps × ÷ −, normalizes dash-separated feet. */
function armar(rawInput: string): string {
  let s = rawInput.trim();
  // Dash-separated feet first, before we consider − for unary/binary swap.
  s = s.replace(/(\d\s*)'\s*-\s*(\d)/g, "$1' $2");
  // Operator symbols — only when they appear as binary ops between operands
  // or as a leading unary minus. Walk characters with a simple state machine.
  s = swapOperatorsForDisplay(s);
  // Thousand separators in plain integer parts (≥ 1000). Skip what's already
  // inside a fraction, feet-inches token, or attached to a unit word.
  s = applyThousandSeparators(s);
  return s;
}

function swapOperatorsForDisplay(s: string): string {
  let out = '';
  let prev = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const next = s[i + 1] || '';
    if (c === '*') { out += '×'; prev = c; continue; }
    if (c === '/') {
      // Don't touch fraction slashes (digit/digit).
      if (/\d/.test(prev) && /\d/.test(next)) { out += '/'; prev = c; continue; }
      out += '÷'; prev = c; continue;
    }
    if (c === '-') {
      // Distinguish minus-as-operator from minus-as-sign-of-leading-number.
      // For display, swap both to the unicode minus sign.
      out += '−'; prev = c; continue;
    }
    out += c;
    prev = c;
  }
  return out;
}

function applyThousandSeparators(s: string): string {
  // Find runs of pure digits (≥ 4 chars) NOT immediately preceded by a
  // letter/quote/apostrophe/slash and NOT followed by a slash/quote.
  return s.replace(/(?<![\w'/."])(\d{4,})(?![\w'/."])/g, (m) => {
    return m.replace(/\B(?=(\d{3})+(?!\d))/g, LOCALE.thousand);
  });
}

// ============================================================================
// EVAL — walk expr-eval RPN with Fraction ops + dim/system tracking
// ============================================================================

const parser = new ExprEvalParser({
  operators: {
    add: true, subtract: true, multiply: true, divide: true,
    power: false, remainder: false, factorial: false,
    comparison: false, logical: false, conditional: false,
    concatenate: false, assignment: false, fndef: false, in: false,
    sin: false, cos: false, tan: false,
    asin: false, acos: false, atan: false,
    sinh: false, cosh: false, tanh: false,
    asinh: false, acosh: false, atanh: false,
    sqrt: false, log: false, ln: false, lg: false, log10: false,
    abs: false, ceil: false, floor: false, round: false, trunc: false,
    exp: false, length: false, random: false, min: false, max: false,
    cbrt: false, expm1: false, log1p: false, sign: false, log2: false,
  },
  allowMemberAccess: false,
});

function evaluateRPN(tokens: Array<{ type: string; value: unknown }>, ctx: Map<string, Quantity>): { q: Quantity; mixedFlag: boolean } {
  const stack: Quantity[] = [];
  let mixedFlag = false;

  for (const tok of tokens) {
    switch (tok.type) {
      case 'INUMBER':
        stack.push({ value: new Fraction(tok.value as number | string), dim: 0, originalUnit: null, system: null });
        break;
      case 'IVAR': {
        const name = tok.value as string;
        const q = ctx.get(name);
        if (!q) throw new EngineError('unknown_token', `variável desconhecida: ${name}`);
        stack.push(q);
        break;
      }
      case 'IOP1': {
        const a = stack.pop();
        if (!a) throw new EngineError('incomplete', 'expressão incompleta');
        if (tok.value === '-') stack.push(negQ(a));
        else if (tok.value === '+') stack.push(a);
        else throw new EngineError('unknown_token', `operador unário desconhecido: ${tok.value}`);
        break;
      }
      case 'IOP2': {
        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) throw new EngineError('incomplete', 'expressão incompleta');
        // Track mixedSystems: any binary op between length operands of
        // distinct systems trips the flag.
        if (a.system && b.system && a.system !== b.system && a.dim >= 1 && b.dim >= 1) {
          mixedFlag = true;
        }
        switch (tok.value) {
          case '+': stack.push(addQ(a, b)); break;
          case '-': stack.push(subQ(a, b)); break;
          case '*': stack.push(mulQ(a, b)); break;
          case '/': stack.push(divQ(a, b)); break;
          default: throw new EngineError('unknown_token', `operador binário desconhecido: ${tok.value}`);
        }
        break;
      }
      default:
        throw new EngineError('unknown_token', `token desconhecido: ${tok.type}`);
    }
  }

  if (stack.length !== 1) throw new EngineError('incomplete', 'expressão incompleta');
  return { q: stack[0], mixedFlag };
}

// ============================================================================
// PERCENTAGE — regex fast path (semantics distinct from operator %)
// ============================================================================

function calculatePercentage(rawInput: string, normalizedExpression: string): CalculationResult | null {
  const expr = rawInput.trim();
  const pctAddSub = expr.match(/^([\d.]+)\s*([+-])\s*([\d.]+)\s*%$/);
  if (pctAddSub) {
    const base = parseFloat(pctAddSub[1]);
    const op = pctAddSub[2];
    const pct = parseFloat(pctAddSub[3]);
    const delta = base * (pct / 100);
    const value = op === '+' ? base + delta : base - delta;
    return buildScalarResult(value, normalizedExpression);
  }
  const pctSimple =
    expr.match(/^([\d.]+)\s*%\s*(?:of|de|×|\*)?\s*([\d.]+)$/i) ||
    expr.match(/^([\d.]+)\s*(?:×|\*)\s*([\d.]+)\s*%$/);
  if (pctSimple) {
    const a = parseFloat(pctSimple[1]);
    const b = parseFloat(pctSimple[2]);
    const value =
      expr.includes('%') && expr.indexOf('%') < expr.length / 2
        ? (a / 100) * b
        : a * (b / 100);
    return buildScalarResult(value, normalizedExpression);
  }
  return null;
}

// ============================================================================
// RESULT BUILDERS — Quantity → CalculationResult per visor matrix
// ============================================================================

function emptyVisorSide(): VisorSide {
  return { value: '', unitLabel: null };
}

function buildScalarResult(value: number, expression: string, exactForm: string | null = null, isApproximate = false): CalculationResult {
  return {
    isError: false,
    expression,
    errorKind: null,
    errorMessage: null,
    errorPosition: null,
    dim: 0,
    dimension: 'scalar',
    mixedSystems: false,
    primary: { value: formatLocaleDecimal(value, 4), unitLabel: null },
    secondary: null,
    isApproximate,
    exactForm,
    valueCanonical: value,
  };
}

function buildErrorResult(expression: string, kind: EngineErrorKind, message: string, position: number | null = null): CalculationResult {
  return {
    isError: true,
    expression,
    errorKind: kind,
    errorMessage: message,
    errorPosition: position,
    dim: 0,
    dimension: 'scalar',
    mixedSystems: false,
    primary: emptyVisorSide(),
    secondary: null,
    isApproximate: false,
    exactForm: null,
    valueCanonical: null,
  };
}

function buildResultFromQuantity(q: Quantity, expression: string, mixedSystems: boolean): CalculationResult {
  const decimal = q.value.valueOf();
  if (!isFinite(decimal)) return buildErrorResult(expression, 'unknown', 'cálculo inválido');

  // Scalar — Volumes 1 & 2.
  if (q.dim === 0) {
    const fracInfo = formatScalarFraction(q.value);
    // Detect repeating decimals → exactForm hint
    let exactForm: string | null = null;
    let isApproximate = fracInfo.isApproximate;
    const denom = Number(q.value.d);
    if (q.value.d !== 1n && q.value.d !== BigInt(1) && denom > 1) {
      // If denominator has prime factors other than 2 and 5, decimal repeats.
      let d = denom;
      while (d % 2 === 0) d /= 2;
      while (d % 5 === 0) d /= 5;
      if (d > 1) {
        const sign = Number(q.value.s);
        const num = Number(q.value.n);
        exactForm = `${sign * num}/${denom}`;
        isApproximate = true;
      }
    }
    // Integer or finite decimal → use locale format. Repeating → 4-digit truncation + exactForm.
    const display = exactForm ? formatLocaleDecimal(decimal, 4) : fracInfo.display;
    return {
      isError: false,
      expression,
      errorKind: null, errorMessage: null, errorPosition: null,
      dim: 0,
      dimension: 'scalar',
      mixedSystems: false,
      primary: { value: display, unitLabel: null },
      secondary: null,
      isApproximate,
      exactForm,
      valueCanonical: decimal,
    };
  }

  // Length — Volumes 3, 4, 7.
  if (q.dim === 1) {
    if (mixedSystems) {
      // Vol 7.1, 7.2 — dual block with imperial/métrico labels.
      const imperial = formatImperialLength(decimal);
      const metric = formatMetricLength(decimal, 'm');
      return {
        isError: false, expression,
        errorKind: null, errorMessage: null, errorPosition: null,
        dim: 1, dimension: 'length',
        mixedSystems: true,
        primary: { value: imperial.display, unitLabel: 'imperial' },
        secondary: { value: metric.display, unitLabel: 'métrico' },
        isApproximate: imperial.isApproximate,
        exactForm: null,
        valueCanonical: decimal,
      };
    }
    if (q.system === 'metric') {
      const metric = formatMetricLength(decimal, q.originalUnit);
      return {
        isError: false, expression,
        errorKind: null, errorMessage: null, errorPosition: null,
        dim: 1, dimension: 'length',
        mixedSystems: false,
        primary: { value: metric.display, unitLabel: null },
        // Alt-notation secondary so the user sees the value in another scale
        // (mm ↔ cm, cm ↔ mm, m ↔ cm) without manual conversion.
        secondary: altMetricLength(decimal, q.originalUnit),
        isApproximate: metric.isApproximate,
        exactForm: null,
        valueCanonical: decimal,
      };
    }
    // Default to imperial when system is unknown or imperial
    const imperial = formatImperialLength(decimal);
    return {
      isError: false, expression,
      errorKind: null, errorMessage: null, errorPosition: null,
      dim: 1, dimension: 'length',
      mixedSystems: false,
      primary: { value: imperial.display, unitLabel: null },
      // Alt-notation secondary: feet+inches ↔ inches-only, so the carpenter
      // sees both forms without having to convert in their head.
      secondary: altImperialLength(decimal),
      isApproximate: imperial.isApproximate,
      exactForm: null,
      valueCanonical: decimal,
    };
  }

  // Area — Volume 5 / 7.3. Dim ≥ 2 always dual.
  if (q.dim === 2) {
    const sqftStr = formatAreaImperial(decimal);
    const sqmStr = formatAreaMetric(decimal);
    const imperialFirst = q.system !== 'metric' && q.originalUnit !== 'sqm' && q.originalUnit !== 'cm' && q.originalUnit !== 'mm' && q.originalUnit !== 'm';
    return imperialFirst ? {
      isError: false, expression,
      errorKind: null, errorMessage: null, errorPosition: null,
      dim: 2, dimension: 'area',
      mixedSystems,
      primary: { value: sqftStr, unitLabel: 'sq ft' },
      secondary: { value: sqmStr, unitLabel: 'm²' },
      isApproximate: false, exactForm: null,
      valueCanonical: decimal,
    } : {
      isError: false, expression,
      errorKind: null, errorMessage: null, errorPosition: null,
      dim: 2, dimension: 'area',
      mixedSystems,
      primary: { value: sqmStr, unitLabel: 'm²' },
      secondary: { value: sqftStr, unitLabel: 'sq ft' },
      isApproximate: false, exactForm: null,
      valueCanonical: decimal,
    };
  }

  // Volume — Volume 6.
  const cuftStr = formatVolumeImperial(decimal);
  const cumStr = formatVolumeMetric(decimal);
  const imperialFirst = q.system !== 'metric' && q.originalUnit !== 'cum' && q.originalUnit !== 'cm' && q.originalUnit !== 'mm' && q.originalUnit !== 'm';
  return imperialFirst ? {
    isError: false, expression,
    errorKind: null, errorMessage: null, errorPosition: null,
    dim: 3, dimension: 'volume',
    mixedSystems,
    primary: { value: cuftStr, unitLabel: 'cu ft' },
    secondary: { value: cumStr, unitLabel: 'm³' },
    isApproximate: false, exactForm: null,
    valueCanonical: decimal,
  } : {
    isError: false, expression,
    errorKind: null, errorMessage: null, errorPosition: null,
    dim: 3, dimension: 'volume',
    mixedSystems,
    primary: { value: cumStr, unitLabel: 'm³' },
    secondary: { value: cuftStr, unitLabel: 'cu ft' },
    isApproximate: false, exactForm: null,
    valueCanonical: decimal,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/** Evaluate a construction-math expression. Returns the v3 visor-shaped
 *  result. Returns `null` only for empty input — every other failure path
 *  returns an `isError: true` result with a typed kind + message. */
export function calculate(input: string): CalculationResult | null {
  const expr = input.trim();
  if (!expr) return null;

  // Build the display armação once; we re-use it on both success and error.
  const armed = armar(expr);

  try {
    if (expr.includes('%')) {
      const pct = calculatePercentage(expr, armed);
      if (pct) return pct;
      // Falls through — expr-eval will reject lone % since `remainder: false`.
    }

    let s = preprocess(expr);
    rejectConsecutiveBinary(s);

    // Detect leading operator before expr-eval throws a generic syntax error.
    if (/^\s*[*/]/.test(s)) {
      throw new EngineError('leading_operator', 'expressão começa com operador binário');
    }
    // Detect trailing operator likewise.
    if (/[+\-*/]\s*$/.test(s)) {
      throw new EngineError('incomplete', 'expressão incompleta');
    }

    const ctx = new Map<string, Quantity>();
    let i = 0;
    s = s.replace(CONSTRUCTION_TOKEN, (match) => {
      const raw = match.trim();
      const meta = detectOriginalUnit(raw);
      const value = parseConstructionToken(raw);
      const name = `__v${i++}`;
      ctx.set(name, { value, dim: meta.dim, originalUnit: meta.unit, system: meta.system });
      return name;
    });

    let parsed;
    try {
      parsed = parser.parse(s);
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      if (/parse\s*error/i.test(msg) || /unexpected/i.test(msg)) {
        if (/\)/.test(s) && /\(/.test(s)) {
          // Likely paren mismatch; check counts.
          const opens = (s.match(/\(/g) || []).length;
          const closes = (s.match(/\)/g) || []).length;
          if (opens !== closes) throw new EngineError('unbalanced_paren', 'parêntese não fechado');
        } else if (/\(/.test(s) && !/\)/.test(s)) {
          throw new EngineError('unbalanced_paren', 'parêntese não fechado');
        }
        if (/\.\d+\./.test(input)) {
          throw new EngineError('malformed_number', `número inválido: ${input.match(/\d+\.\d+\.\d+/)?.[0] ?? input}`);
        }
        throw new EngineError('incomplete', 'expressão incompleta');
      }
      throw new EngineError('unknown', msg || 'erro desconhecido');
    }

    const rpn = (parsed as unknown as { tokens: Array<{ type: string; value: unknown }> }).tokens;
    const { q, mixedFlag } = evaluateRPN(rpn, ctx);
    return buildResultFromQuantity(q, armed, mixedFlag);
  } catch (e) {
    if (e instanceof EngineError) {
      return buildErrorResult(armed, e.kind, e.message, e.position);
    }
    return buildErrorResult(armed, 'unknown', 'erro desconhecido');
  }
}

// ============================================================================
// LEGACY-COMPAT HELPERS — minimal surface kept for stairs/triangle imports
// ============================================================================

/** Parse a single construction-style token (e.g. "5 1/2", "2' 6\"") to inches.
 *  Returns 0 on parse failure (callers use this for stairs/triangle inputs;
 *  errors there mean blank input). */
export function parseToInches(str: string): number {
  const input = str.trim();
  if (!input) return 0;
  const sign = input.startsWith('-') ? -1 : 1;
  const body = sign < 0 ? input.slice(1).trim() : input;
  try {
    const preprocessed = preprocess(body);
    const f = parseConstructionToken(preprocessed);
    return sign * f.valueOf();
  } catch {
    return 0;
  }
}

/** Format a decimal-inches value as imperial display. Returns just the
 *  display string (no metadata). Stairs/Triangle components consume this. */
export function formatInches(inches: number): string {
  return formatImperialLength(inches).display;
}

/** Total-inches form ("24 7/8 In") — used by Stairs panel. */
export function formatTotalInches(inches: number): string {
  if (!isFinite(inches)) return 'Erro';
  const negative = inches < 0;
  const abs = Math.abs(inches);
  const snap = snapInchesToSixteenths(abs);
  const total = snap.whole;
  if (snap.sixteenths === 0) return (negative ? '−' : '') + String(total);
  const { n, d } = reduceFraction(snap.sixteenths, 16);
  return `${negative ? '−' : ''}${total} ${n}/${d} In`;
}

// Tokenize/evaluateTokens: kept as thin shims for any dangling import.
export function tokenize(expression: string): string[] {
  const s = preprocess(expression).trim();
  if (!s) return [];
  const out: string[] = [];
  let buf = '';
  const flush = () => { if (buf.trim()) { out.push(buf.trim()); buf = ''; } };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const next = s[i + 1] || '';
    if ((c === '+' || c === '-' || c === '*' || c === '/') && buf.trim() !== '') {
      if (c === '/' && /\d$/.test(buf.trim()) && /^\d/.test(next)) { buf += c; continue; }
      flush();
      out.push(c);
      continue;
    }
    buf += c;
  }
  flush();
  return out;
}

export function evaluateTokens(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const r = calculate(tokens.join(' '));
  if (!r || r.isError) return 0;
  // Best-effort numeric back-out. Length comes back as inches via
  // primary.value parsing — but for downstream callers (legacy tests) we
  // need a numeric fallback. Walk the value.
  return parseFloat(r.primary.value.replace(',', '.').replace(/[^\d.\-−]/g, '')) || 0;
}
