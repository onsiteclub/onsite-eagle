// src/engine/types.ts
// Engine contract — structured input/output types.
// Pure types, zero runtime dependencies. Safe to import from anywhere.

/** Phase 1 — dimensional arithmetic. Powers of length:
 *  scalar = pure number, length = inches, area = sq inches, volume = cu inches. */
export type DimensionType = 'scalar' | 'length' | 'area' | 'volume';

/** Canonical unit each dimension reports its value in.
 *  length → inches, area → square inches, volume → cubic inches. */
export type CanonicalUnit = 'number' | 'in' | 'sqin' | 'cuin';

export interface CalculationResult {
  /** Numeric result in the canonical unit for the dimension.
   *  scalar → plain number. length → inches. area → sqin. volume → cuin. */
  valueCanonical: number;

  /** What kind of quantity the result represents. */
  dimension: DimensionType;

  /** The canonical unit the engine stored the value in. */
  unitCanonical: CanonicalUnit;

  /** Primary display string — pre-formatted for the dimension.
   *  Length: `"2' 6\""` or `"5 1/2\""`. Area: `"803.25 sq ft"`. Volume: `"125 cu ft"`. Scalar: `"11.5"`. */
  displayPrimary: string;

  /** Secondary display — usually the same value in the "other" common unit.
   *  Length: total inches `"30 in"`. Area: total sq in `"115668 sq in"`. Scalar: `"—"`. */
  displaySecondary: string;

  // === Phase 0 legacy fields (kept for compat with existing consumers) ===
  // New consumers should prefer the typed fields above. These mirrors stay
  // correct only when dimension === 'length' or 'scalar'.

  /** Formato feet/inches: "8' 1\"" — valid only when dimension is length. */
  resultFeetInches: string;
  /** Formato polegadas totais: "97 In" — valid only when dimension is length. */
  resultTotalInches: string;
  /** Valor decimal em polegadas (length) ou número puro (scalar).
   *  For area/volume holds valueCanonical in sqin/cuin — check `dimension` to interpret. */
  resultDecimal: number;
  /** Expressão original. */
  expression: string;
  /** true = medidas de construção, false = matemática pura (deprecated — use `dimension`). */
  isInchMode: boolean;
}

export interface Token {
  type: 'number' | 'fraction' | 'mixed' | 'feet' | 'operator';
  value: string;
  numericValue?: number;
}
