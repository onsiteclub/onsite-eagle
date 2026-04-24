// src/engine/engine.ts
// Engine v2 — exact-arithmetic construction calculator.
//
// Architecture
// ============
// Split of responsibility:
//   1. Preprocess  — normalize unicode ops, strip thousand separators, accept PT
//                    decimal comma, collapse dash-separated feet-inches notation
//                    (2'-6" → 2' 6"), reject consecutive binary operators.
//   2. Extract     — scan for construction-specific number tokens (feet-inches,
//                    mixed numbers, bare fractions), replace each with a
//                    placeholder variable __v{i}. The extracted Quantity (value
//                    as Fraction + dimension) is stashed in a context map.
//   3. Parse       — hand the placeholder-substituted expression to expr-eval's
//                    parser. Expr-eval validates parens, unary, PEMDAS, catches
//                    malformed numbers (1.2.3), trailing operators, unbalanced
//                    parens — everything the legacy hand-rolled evaluator
//                    silently accepted.
//   4. Evaluate    — walk expr-eval's internal RPN (Expression.tokens) ourselves,
//                    using fraction.js for exact rational arithmetic. Walking
//                    the RPN instead of calling expr.evaluate() is how we sneak
//                    Fraction math past expr-eval's number-native operators.
//                    Dimensional coercion (length × length = area, etc.) is
//                    applied at each IOP2 step.
//   5. Build       — convert the final Fraction → decimal (only at the boundary,
//                    for display), package with dimension-aware formatters.
//
// Domain rules codified here (each came from an adversarial test or directive):
//   - 2'-6"  = 30 inches       (dash is notation, NOT subtraction)
//   - -2' 6" = -30 inches      (leading minus applies to the whole quantity)
//   - 3,5    = 3.5             (PT decimal comma)
//   - 1,234  = 1234            (comma followed by exactly 3 digits = thousand sep)
//   - 1.2.3  = Error           (malformed, not silent truncation to 1.2)
//   - * 5    = Error           (leading binary operator)
//   - 5 +    = Error           (trailing operator)
//   - 5 ++ 3 = Error           (consecutive binary, even if expr-eval would accept)
//   - 5 -- 3 = 8               (unary after binary is OK for `-`)
//   - 0.1+0.2 = exactly 0.3    (Fraction backbone eliminates IEEE-754 drift)
//   - Bare "N/D" requires N < D (proper fraction). "51/2" without a space is
//     rejected — improper bare fractions must be written as mixed numbers.
//
// Pure module: no React, no Supabase, no network. Engine throws on invalid
// input; `calculate()` wraps and returns an error result.

import Fraction from 'fraction.js';
import { Parser as ExprEvalParser } from 'expr-eval';
import type { CalculationResult, DimensionType } from './types';

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/** Power-of-length exponent. 0 scalar, 1 length, 2 area, 3 volume. */
type Dim = 0 | 1 | 2 | 3;

/** A number with its dimension. Length values are stored in inches, area in
 *  square inches, volume in cubic inches. */
interface Quantity {
  value: Fraction;
  dim: Dim;
}

function dimName(d: Dim): DimensionType {
  return (['scalar', 'length', 'area', 'volume'] as const)[d];
}

// ============================================================================
// PREPROCESSING
// ============================================================================

/** Normalize unicode operators, handle dash-separated feet-inches, resolve PT
 *  decimal comma and US thousand separators. */
function preprocess(input: string): string {
  let s = input.trim();
  s = s.replace(/×/g, '*').replace(/÷/g, '/');
  // Dash between feet marker and inches is notation, not subtraction.
  // "2'-6" becomes "2' 6"; also "2' - 6\"" collapses to "2' 6\"".
  s = s.replace(/(\d\s*)'\s*-\s*(\d)/g, "$1' $2");
  // Thousand separators: digit comma exactly-3-digits, not followed by another digit.
  s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  // PT decimal comma: digit comma digit (after thousand stripping, remaining
  // commas between digits must be decimal points).
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  // Collapse internal whitespace.
  s = s.replace(/[\t\n\r]+/g, ' ').replace(/ {2,}/g, ' ');
  return s;
}

// Reject consecutive binary operators (double-plus, plus-star, star-slash,
// slash-slash, plus-slash). We accept `-` after any binary op — it becomes a
// unary minus, mathematically sound. We accept `+` after `-`/`*`/`/` as
// unary-plus (no-op). Rejecting two "real binary" operators adjacent because
// that's always a typo.
//
// (This comment is `//` line-style on purpose — a JSDoc block containing the
// string `*` followed by `/` closes the comment early.)
function rejectConsecutiveBinary(s: string): void {
  // Matches any pair of operators where the SECOND is +, *, or / (not -).
  // Examples caught: double-plus, plus-star, star-slash, slash-slash, plus-slash.
  // Examples NOT caught (intentional — unary minus is legal after any binary):
  // plus-minus, star-minus, slash-minus, minus-minus.
  if (/[+\-*/]\s*[+*/]/.test(s)) {
    throw new Error('Consecutive binary operators');
  }
}

// ============================================================================
// CONSTRUCTION TOKEN EXTRACTION
// ============================================================================

// Regex matching a construction-specific number token. Ordered longest-first:
// feet+wholeInches+fraction, feet+fraction, feet+wholeInches, bare feet,
// mixed number, bare fraction. Trailing inch marker always optional. Leading
// minus is NOT captured (unary handled by expr-eval downstream).
// Built via RegExp constructor so the apostrophe and quote characters can live
// in a plain string instead of a regex literal.
const APOS = "'";
const QUOTE = '"';
const CT_PATTERN =
  '\\b\\d+(?:\\.\\d+)?\\s*' + APOS + '\\s*\\d+\\s+\\d+/\\d+\\s*' + QUOTE + '?' +
  '|\\b\\d+(?:\\.\\d+)?\\s*' + APOS + '\\s*\\d+/\\d+\\s*' + QUOTE + '?' +
  '|\\b\\d+(?:\\.\\d+)?\\s*' + APOS + '\\s*\\d+\\s*' + QUOTE + '?' +
  '|\\b\\d+(?:\\.\\d+)?\\s*' + APOS +
  '|\\b\\d+\\s+\\d+/\\d+\\s*' + QUOTE + '?' +
  '|\\b\\d+/\\d+\\s*' + QUOTE + '?' +
  // Bare-inches token: digit(s) followed by an inch quote, possibly with a
  // space between (the PT parser emits "3 \"" for "três polegadas"). Without
  // this branch the standalone inch quote would leak to expr-eval as garbage.
  '|\\b\\d+(?:\\.\\d+)?\\s*' + QUOTE;
const CONSTRUCTION_TOKEN = new RegExp(CT_PATTERN, 'g');

/** Parse a single construction number literal into a Fraction. The token must
 *  not include a leading sign (caller handles that via unary minus). */
function parseConstructionToken(raw: string): Fraction {
  // Strip inch quotes AND any whitespace introduced by the regex capturing
  // spaces on either side of the marker (e.g. the token "3 \"" becomes "3").
  let s = raw.trim().replace(/"/g, '').trim();

  let totalInches = new Fraction(0);

  // Feet-inches form.
  if (s.includes("'")) {
    const apo = s.indexOf("'");
    const feetStr = s.slice(0, apo).trim();
    const rest = s.slice(apo + 1).trim();

    if (!/^\d+(?:\.\d+)?$/.test(feetStr)) {
      throw new Error(`Malformed feet value: "${feetStr}"`);
    }
    totalInches = new Fraction(feetStr).mul(12);
    s = rest;
  }

  if (!s) return totalInches;

  // Mixed number "W N/D"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const [, whole, num, den] = mixed;
    if (den === '0') throw new Error('Zero denominator in fraction');
    return totalInches.add(new Fraction(whole)).add(new Fraction(+num, +den));
  }

  // Bare fraction "N/D" — proper only (N < D) to avoid silently accepting
  // "51/2" without a space (test #8 in adversarial). Improper bare fractions
  // must be rewritten as mixed numbers "25 1/2".
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const num = +frac[1];
    const den = +frac[2];
    if (den === 0) throw new Error('Zero denominator in fraction');
    if (num >= den) {
      throw new Error(`Improper bare fraction "${num}/${den}" — use mixed form`);
    }
    return totalInches.add(new Fraction(num, den));
  }

  // Plain decimal or integer — strict regex to catch `1.2.3` and `10..5`.
  if (!/^\d+(?:\.\d+)?$/.test(s)) {
    throw new Error(`Malformed number: "${s}"`);
  }
  return totalInches.add(new Fraction(s));
}

/** Classify a construction token's dimension. `'` or `"` ⇒ length; a fraction
 *  on its own ⇒ length (imperial convention — `1/2` is half-inch, not 0.5). */
function classifyTokenDim(raw: string): Dim {
  if (/['"]/.test(raw)) return 1;
  if (/\d+\/\d+/.test(raw)) return 1;
  return 0;
}

// ============================================================================
// QUANTITY ALGEBRA (Fraction-based, with dim tracking)
// ============================================================================

function mulQ(a: Quantity, b: Quantity): Quantity {
  const newDim = a.dim + b.dim;
  if (newDim > 3) throw new Error('Dimension above volume (dim > 3)');
  return { value: a.value.mul(b.value), dim: newDim as Dim };
}

function divQ(a: Quantity, b: Quantity): Quantity {
  if (b.value.equals(0)) throw new Error('Division by zero');
  const newDim = a.dim - b.dim;
  if (newDim < 0) throw new Error('Division produces negative dimension');
  return { value: a.value.div(b.value), dim: newDim as Dim };
}

function coerceForAddSub(a: Quantity, b: Quantity): [Quantity, Quantity] {
  if (a.dim === b.dim) return [a, b];
  if (a.dim === 0) return [{ value: a.value, dim: b.dim }, b];
  if (b.dim === 0) return [a, { value: b.value, dim: a.dim }];
  throw new Error(`Cannot add/subtract ${dimName(a.dim)} with ${dimName(b.dim)}`);
}

function addQ(a: Quantity, b: Quantity): Quantity {
  const [l, r] = coerceForAddSub(a, b);
  return { value: l.value.add(r.value), dim: l.dim };
}

function subQ(a: Quantity, b: Quantity): Quantity {
  const [l, r] = coerceForAddSub(a, b);
  return { value: l.value.sub(r.value), dim: l.dim };
}

function negQ(a: Quantity): Quantity {
  return { value: a.value.neg(), dim: a.dim };
}

// ============================================================================
// FORMATTERS
// ============================================================================
// Formatters take `number` (decimal) because display output is ultimately a
// string and floats round-trip fine through here. Exact math already happened
// upstream in Fraction land.

/** Imperial display: 30 → "2' 6\"", 11.5 → "11 1/2\"", 20 → "20". */
export function formatInches(inches: number): string {
  if (!isFinite(inches)) return 'Error';

  const negative = inches < 0;
  inches = Math.abs(inches);

  let feet = Math.floor(inches / 12);
  const remaining = inches - feet * 12;
  let whole = Math.floor(remaining);
  const frac = remaining - whole;

  let sixteenths = Math.round(frac * 16);
  if (sixteenths === 16) {
    sixteenths = 0;
    whole += 1;
    if (whole === 12) { whole = 0; feet += 1; }
  }

  let fracStr = '';
  if (sixteenths > 0) {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const d = gcd(sixteenths, 16);
    fracStr = `${sixteenths / d}/${16 / d}`;
  }

  const hasFeet = feet > 0;
  const hasWhole = whole > 0;
  const hasFrac = fracStr !== '';

  if (!hasFeet && !hasWhole && !hasFrac) return '0';

  const inchParts: string[] = [];
  if (hasWhole) inchParts.push(String(whole));
  if (hasFrac) inchParts.push(fracStr);
  const inchText = inchParts.join(' ');

  const quote = hasFrac || (hasFeet && inchText) ? '"' : '';

  let result: string;
  if (hasFeet && inchText) {
    result = `${feet}' ${inchText}${quote}`;
  } else if (hasFeet) {
    result = `${feet}'`;
  } else {
    result = `${inchText}${quote}`;
  }

  return (negative ? '-' : '') + result;
}

/** Total-inches display with fraction: 24.875 → "24 7/8 In", 20 → "20". */
export function formatTotalInches(inches: number): string {
  if (!isFinite(inches)) return 'Error';

  const negative = inches < 0;
  inches = Math.abs(inches);

  const whole = Math.floor(inches);
  const frac = inches - whole;

  const sixteenths = Math.round(frac * 16);
  let fracStr = '';
  let adjustedWhole = whole;

  if (sixteenths > 0 && sixteenths < 16) {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const d = gcd(sixteenths, 16);
    fracStr = ` ${sixteenths / d}/${16 / d}`;
  } else if (sixteenths === 16) {
    adjustedWhole = whole + 1;
  }

  const hasFraction = fracStr !== '';
  if (hasFraction) {
    return (negative ? '-' : '') + adjustedWhole + fracStr + ' In';
  }
  return (negative ? '-' : '') + adjustedWhole.toString();
}

function formatNumber(num: number): string {
  if (!isFinite(num)) return 'Error';
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(2)).toString();
}

function formatArea(sqin: number): { primary: string; secondary: string } {
  const sqft = sqin / 144;
  return { primary: `${formatNumber(sqft)} sq ft`, secondary: `${formatNumber(sqin)} sq in` };
}

function formatVolume(cuin: number): { primary: string; secondary: string } {
  const cuft = cuin / 1728;
  return { primary: `${formatNumber(cuft)} cu ft`, secondary: `${formatNumber(cuin)} cu in` };
}

// ============================================================================
// PARSE TO INCHES (legacy-compatible public API)
// ============================================================================
// Returns a `number`, not a `Fraction`, because existing UI components
// (StairsCalculator, TriangleCalculator, UnitConverter) import and consume
// this as a decimal. Internally the work is exact.

export function parseToInches(str: string): number {
  const input = str.trim();
  if (!input) return 0;

  // Handle leading sign (unary minus applies to the whole quantity).
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

// ============================================================================
// EVALUATE — walk expr-eval's RPN applying Fraction operations
// ============================================================================

// Single parser instance; we disable the risky/unused operator families and
// every transcendental function to reduce surface area. What remains: +, -,
// *, /, parens, unary minus/plus.
const parser = new ExprEvalParser({
  operators: {
    add: true,
    subtract: true,
    multiply: true,
    divide: true,
    power: false,
    remainder: false,
    factorial: false,
    comparison: false,
    logical: false,
    conditional: false,
    concatenate: false,
    assignment: false,
    fndef: false,
    in: false,
    // Disable transcendental functions so `Math.PI` or `sin(1)` don't evaluate
    // (belt-and-suspenders — we don't pass them as context either).
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

/** Walks expr-eval's internal RPN (Expression.tokens) using Fraction operations
 *  keyed by our placeholder context. This is how we get exact arithmetic —
 *  expr-eval's own evaluator works in `number` and would leak IEEE-754 drift. */
function evaluateRPN(tokens: Array<{ type: string; value: unknown }>, ctx: Map<string, Quantity>): Quantity {
  const stack: Quantity[] = [];

  for (const tok of tokens) {
    switch (tok.type) {
      case 'INUMBER': {
        // Raw numeric literal that didn't need construction extraction.
        // Starts as a scalar; dimensional coercion happens on operators.
        stack.push({ value: new Fraction(tok.value as number | string), dim: 0 });
        break;
      }
      case 'IVAR': {
        const name = tok.value as string;
        const q = ctx.get(name);
        if (!q) throw new Error(`Unknown variable: ${name}`);
        stack.push(q);
        break;
      }
      case 'IOP1': {
        const a = stack.pop();
        if (!a) throw new Error('Stack underflow at unary operator');
        switch (tok.value) {
          case '-': stack.push(negQ(a)); break;
          case '+': stack.push(a); break;
          default:  throw new Error(`Unsupported unary operator: ${tok.value}`);
        }
        break;
      }
      case 'IOP2': {
        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) throw new Error('Stack underflow at binary operator');
        switch (tok.value) {
          case '+': stack.push(addQ(a, b)); break;
          case '-': stack.push(subQ(a, b)); break;
          case '*': stack.push(mulQ(a, b)); break;
          case '/': stack.push(divQ(a, b)); break;
          default:  throw new Error(`Unsupported binary operator: ${tok.value}`);
        }
        break;
      }
      default:
        throw new Error(`Unsupported token type: ${tok.type}`);
    }
  }

  if (stack.length !== 1) throw new Error('Eval stack imbalance');
  return stack[0];
}

// ============================================================================
// PERCENTAGE (regex fast path — same semantics as legacy)
// ============================================================================

function calculatePercentage(expr: string): CalculationResult | null {
  // "100 + 10%" = 110, "100 - 20%" = 80.
  const pctAddSub = expr.match(/^([\d.]+)\s*([+-])\s*([\d.]+)\s*%$/);
  if (pctAddSub) {
    const base = parseFloat(pctAddSub[1]);
    const op = pctAddSub[2];
    const pct = parseFloat(pctAddSub[3]);
    const delta = base * (pct / 100);
    const value = op === '+' ? base + delta : base - delta;
    return buildScalarResult(value, expr);
  }

  // "20% of 150", "150 * 20%"
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
    return buildScalarResult(value, expr);
  }

  // Ambiguous / unsupported percent forms (e.g. "50% + 10%") fall through;
  // caller proceeds to the regular pipeline where expr-eval handles unknown
  // `%` as an error (we disabled the remainder operator).
  return null;
}

// ============================================================================
// RESULT BUILDERS (shape-compatible with legacy)
// ============================================================================

function buildScalarResult(value: number, expression: string): CalculationResult {
  return {
    valueCanonical: value,
    dimension: 'scalar',
    unitCanonical: 'number',
    displayPrimary: formatNumber(value),
    displaySecondary: '—',
    resultFeetInches: formatNumber(value),
    resultTotalInches: '—',
    resultDecimal: value,
    expression,
    isInchMode: false,
  };
}

function buildErrorResult(expression: string): CalculationResult {
  return {
    valueCanonical: NaN,
    dimension: 'scalar',
    unitCanonical: 'number',
    displayPrimary: 'Error',
    displaySecondary: 'Error',
    resultFeetInches: 'Error',
    resultTotalInches: 'Error',
    resultDecimal: NaN,
    expression,
    isInchMode: true,
  };
}

function buildResultFromQuantity(q: Quantity, expression: string): CalculationResult {
  const decimal = q.value.valueOf();
  if (!isFinite(decimal)) return buildErrorResult(expression);

  switch (q.dim) {
    case 0:
      return buildScalarResult(decimal, expression);
    case 1: {
      const primary = formatInches(decimal);
      const secondary = formatTotalInches(decimal);
      return {
        valueCanonical: decimal,
        dimension: 'length',
        unitCanonical: 'in',
        displayPrimary: primary,
        displaySecondary: secondary,
        resultFeetInches: primary,
        resultTotalInches: secondary,
        resultDecimal: decimal,
        expression,
        isInchMode: true,
      };
    }
    case 2: {
      const { primary, secondary } = formatArea(decimal);
      return {
        valueCanonical: decimal,
        dimension: 'area',
        unitCanonical: 'sqin',
        displayPrimary: primary,
        displaySecondary: secondary,
        resultFeetInches: primary,
        resultTotalInches: secondary,
        resultDecimal: decimal,
        expression,
        isInchMode: false,
      };
    }
    case 3: {
      const { primary, secondary } = formatVolume(decimal);
      return {
        valueCanonical: decimal,
        dimension: 'volume',
        unitCanonical: 'cuin',
        displayPrimary: primary,
        displaySecondary: secondary,
        resultFeetInches: primary,
        resultTotalInches: secondary,
        resultDecimal: decimal,
        expression,
        isInchMode: false,
      };
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Evaluate a construction-math expression. Accepts feet-inches (`2' 6"`,
 * `2'-6"`, `-2' 6"`), mixed numbers (`5 1/2`), bare proper fractions (`3/4`),
 * integers/decimals (with PT decimal comma and US thousand separators), and
 * the usual `+ - * /` with parens and unary minus.
 *
 * Returns `null` for empty input. On syntax errors returns a
 * `CalculationResult` with `displayPrimary === 'Error'` — matching legacy
 * caller expectations.
 */
export function calculate(input: string): CalculationResult | null {
  const expr = input.trim();
  if (!expr) return null;

  try {
    // Percentage fast path — same regex-based handling as legacy because the
    // semantics ("100 + 10%" = 110, not 100.1) don't compose cleanly as a
    // generic operator inside Shunting-yard.
    if (expr.includes('%')) {
      const pct = calculatePercentage(expr);
      if (pct) return pct;
      // "%"-bearing inputs that don't match the fast-path (e.g. "50% + 10%"
      // or "10 % 3") fall through. expr-eval will reject the bare `%` because
      // we disabled the remainder operator above, producing an Error result.
    }

    let s = preprocess(expr);
    rejectConsecutiveBinary(s);

    // Extract construction tokens, substitute with placeholder vars.
    const ctx = new Map<string, Quantity>();
    let i = 0;
    s = s.replace(CONSTRUCTION_TOKEN, (match) => {
      const raw = match.trim();
      const value = parseConstructionToken(raw);
      const dim = classifyTokenDim(raw);
      const name = `__v${i++}`;
      ctx.set(name, { value, dim });
      return name;
    });

    // Hand the placeholder-substituted expression to expr-eval.
    // Throws on malformed numbers (1.2.3), unbalanced parens, unknown tokens,
    // leading/trailing operators — everything the legacy engine swallowed.
    const parsed = parser.parse(s);

    // Walk expr-eval's internal RPN ourselves so exact Fraction arithmetic
    // travels all the way through. Expression.tokens is runtime-public even
    // though not in the .d.ts.
    const rpn = (parsed as unknown as { tokens: Array<{ type: string; value: unknown }> }).tokens;
    const q = evaluateRPN(rpn, ctx);

    return buildResultFromQuantity(q, expr);
  } catch {
    // Engine is pure — swallow and return an error result. Callers decide
    // how (or whether) to log.
    return buildErrorResult(expr);
  }
}

// ============================================================================
// LEGACY-COMPATIBLE HELPERS
// ============================================================================
// Kept for test compatibility (calculator.test.ts imports these). They round-trip
// through `calculate()` so correctness tracks the real engine. Don't use in new
// code — the rich `CalculationResult` from `calculate()` has strictly more info.

/** @deprecated split-string tokenizer. Kept for test compat; prefer `calculate`. */
export function tokenize(expression: string): string[] {
  const s = preprocess(expression).trim();
  if (!s) return [];

  // Mirrors legacy behavior at a coarse level: splits on operators that are
  // outside construction tokens. Tests only check alternating structure.
  const out: string[] = [];
  let buf = '';
  const flush = () => { if (buf.trim()) { out.push(buf.trim()); buf = ''; } };

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const next = s[i + 1] || '';
    if ((c === '+' || c === '-' || c === '*' || c === '/') && buf.trim() !== '') {
      // Fraction slash inside digits ≠ division operator.
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

/** @deprecated evaluates a pre-tokenized expression. Re-joins and re-calculates. */
export function evaluateTokens(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const r = calculate(tokens.join(' '));
  return r?.resultDecimal ?? 0;
}
