// src/engine/types.ts
// Engine v2 contract — visor-driven shape per cenarios-visor-calculadora-onsite-v3.html.
//
// Pure types, zero runtime deps. Safe to import from anywhere.

/** Phase 1 dimensional arithmetic. Powers of length. */
export type DimensionType = 'scalar' | 'length' | 'area' | 'volume';

/** Numeric integer power for internal arithmetic.
 *  0 scalar, 1 length, 2 area, 3 volume. */
export type Dim = 0 | 1 | 2 | 3;

/** Original unit the user typed for a measurement token. Drives unit
 *  preservation rules (Vol 4.4: keep mm when input was mm, etc.). */
export type OriginalUnit =
  | 'in' | 'ft' | 'sqft' | 'cuft'
  | 'mm' | 'cm' | 'm' | 'sqm' | 'cum'
  | 'sqin' | 'cuin'
  | null;

export type System = 'imperial' | 'metric';

/** Specific failure modes the engine surfaces back to the visor.
 *  Vol 8 of the spec lists the user-facing messages per kind. */
export type EngineErrorKind =
  | 'incomplete'           // trailing operator: "5 +"
  | 'unbalanced_paren'     // "(2 + 3"
  | 'malformed_number'     // "1.2.3"
  | 'division_by_zero'     // "10 / 0"
  | 'duplicate_operators'  // "5 ++ 3"
  | 'leading_operator'     // "* 5"
  | 'unknown_token'        // garbage chars
  | 'dimension_mismatch'   // length + area
  | 'unknown';             // anything that escapes the catch funnel

/** A single side of the visor display (primary or secondary).
 *  `unitLabel` is the small uppercase tag rendered above the value when
 *  needed for disambiguation (sq ft, m², imperial, etc.). */
export interface VisorSide {
  /** Pre-formatted display string. e.g. "5' 0\"", "96", "8 3/4", "6 m". */
  value: string;
  /** Small uppercase label rendered above `value`. null when redundant
   *  (a bare scalar or single-system length needs no label). */
  unitLabel: string | null;
}

export interface CalculationResult {
  /** True when the engine couldn't evaluate the input. When true, only
   *  `expression`, `errorMessage` and (optionally) `errorPosition` are
   *  meaningful — primary/secondary will be empty. */
  isError: boolean;

  /** Normalized "armação" — the input with thousand separators, locale
   *  decimal mark, and unicode operators (× ÷ −) applied. The visor renders
   *  this in the small expression line above the result. */
  expression: string;

  /** Error metadata — populated only when `isError === true`. */
  errorKind: EngineErrorKind | null;
  errorMessage: string | null;
  /** 0-based char index in the *normalized* expression. UI may underline. */
  errorPosition: number | null;

  // === Success-path fields. Inhabited only when isError === false. ===

  /** scalar | length | area | volume. */
  dim: Dim;
  dimension: DimensionType;

  /** True when input combined imperial and metric units. UI swaps the
   *  dual-side labels from "sq ft / m²" style to "imperial / métrico". */
  mixedSystems: boolean;

  /** Primary visor block — the answer. */
  primary: VisorSide;

  /** Secondary block — null unless dim ≥ 2 OR mixedSystems is true. */
  secondary: VisorSide | null;

  /** True when display rounding altered the value (e.g. 1/16" snap on a
   *  metric→imperial conversion). UI renders ≈ glyph in the dica line. */
  isApproximate: boolean;

  /** Exact rational form for repeating decimals. Visor renders the
   *  hint line "≈ · exato: 10/3" when present. null otherwise. */
  exactForm: string | null;

  /** Numeric value in the dim's canonical base — inches for length, square
   *  inches for area, cubic inches for volume, plain number for scalar. null
   *  on errors. Not for display (use `primary.value`); useful for tests,
   *  chained ops, and any caller that needs the underlying number. */
  valueCanonical: number | null;
}

// ============================================================================
// LEGACY-FREE: the v3 spec dropped the flat compatibility fields. Anything
// that was using `displayPrimary`, `displaySecondary`, `resultFeetInches`,
// `resultTotalInches`, `resultDecimal`, `valueCanonical`, `unitCanonical`,
// or `isInchMode` should migrate to `primary.value`, `secondary.value`,
// `dim`, `dimension`, etc.
// ============================================================================

/** Internal: a token type the legacy compat helper still emits. */
export interface Token {
  type: 'number' | 'fraction' | 'mixed' | 'feet' | 'operator';
  value: string;
  numericValue?: number;
}
