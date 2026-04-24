// src/types/calculator.ts
// UI, voice and history types for the Calculator app.
// Engine-owned contract types (CalculationResult, DimensionType, CanonicalUnit,
// Token) live in `src/engine/types.ts` and are re-exported here for backward
// compatibility with existing consumers. New code should import engine types
// directly from `src/engine`.

export type {
  CalculationResult,
  DimensionType,
  CanonicalUnit,
  Token,
} from '../engine/types';

import type {
  DimensionType,
  CanonicalUnit,
} from '../engine/types';

export type VoiceState = 'idle' | 'recording' | 'processing';

/** Step 2 — a routed intent is what the Calculator tab hands over to another
 *  tab when GPT classifies the voice input as stairs/triangle/conversion.
 *  The destination tab can consume `expression` + `parameters` on mount to
 *  pre-fill its form; null means "no pending hand-off". */
export interface RoutedIntent {
  /** Engine-ready expression string (may be parseable by the destination). */
  expression?: string;
  /** Structured parameters GPT extracted — shape depends on the intent. */
  parameters?: Record<string, unknown>;
  /** Raw transcription for debugging / user feedback ("você disse …"). */
  transcription?: string;
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
