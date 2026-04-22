// src/types/calculator.ts
// Tipos para o engine de cálculo

export type VoiceState = 'idle' | 'recording' | 'processing';

/** Phase 1 — dimensional arithmetic. `dim` counts powers of length:
 *  0 = pure number (2 + 3 = 5)
 *  1 = length (5' 6" = 66 inches)
 *  2 = area (5' × 5' = 25 sqft)
 *  3 = volume (5' × 5' × 5' = 125 cuft)
 */
export type DimensionType = 'scalar' | 'length' | 'area' | 'volume';

/** Canonical unit each dimension reports its value in.
 *  length → inches, area → square inches, volume → cubic inches.
 *  Display formatters convert to feet/sqft/cuft as needed. */
export type CanonicalUnit = 'number' | 'in' | 'sqin' | 'cuin';

export interface CalculationResult {
  // === Phase 1 additions (source of truth going forward) ===

  /** Numeric result in the canonical unit for the dimension.
   *  `dim=0` → plain number. `dim=1` → inches. `dim=2` → sqin. `dim=3` → cuin. */
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
  // Phase 3+ components (ConversationCard) should prefer the typed fields above.
  // These mirrors stay correct only when `dimension === 'length'` or `'scalar'`.

  /** Formato feet/inches: "8' 1\"" — valid only when dimension is length. */
  resultFeetInches: string;
  /** Formato polegadas totais: "97 In" — valid only when dimension is length. */
  resultTotalInches: string;
  /** Valor decimal em polegadas (length) ou número puro (scalar).
   *  For area/volume this holds valueCanonical in sqin/cuin — check `dimension` to interpret. */
  resultDecimal: number;
  /** Expressão original */
  expression: string;
  /** true = medidas de construção, false = matemática pura (deprecated — use `dimension`). */
  isInchMode: boolean;
}

export interface Token {
  type: 'number' | 'fraction' | 'mixed' | 'feet' | 'operator';
  value: string;
  numericValue?: number;
}

export interface VoiceResponse {
  expression: string;
  error?: string;
  voice_log_id?: string;
}

export interface HistoryEntry {
  id: string;
  expression: string;
  resultFeetInches: string;
  resultTotalInches: string;
  resultDecimal: number;
  isInchMode: boolean;
  timestamp: number;

  /** How the expression was produced. Older entries may lack this field. */
  inputMethod?: 'manual' | 'voice';
  /** Raw Whisper transcription, when inputMethod === 'voice' and user consented. */
  transcription?: string;
  /** Server-side voice_log UUID, when the voice pipeline persisted a row. */
  voiceLogId?: string;

  // Phase 1 — dimensional fields. Optional for backward compat with older
  // persisted entries; when present they drive the card display.
  dimension?: DimensionType;
  unitCanonical?: CanonicalUnit;
  displayPrimary?: string;
  displaySecondary?: string;
}
