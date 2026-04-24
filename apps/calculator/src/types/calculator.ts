// src/types/calculator.ts
// UI, voice and history types for the Calculator app.
// Engine-owned contract types live in `src/engine/types.ts`; we re-export the
// ones that consumers also reference.

export type {
  CalculationResult,
  DimensionType,
  Dim,
  OriginalUnit,
  System,
  EngineErrorKind,
  VisorSide,
  Token,
} from '../engine/types';

import type { DimensionType, VisorSide } from '../engine/types';

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

/** A persisted history entry — same shape the v3 visor consumes for replay,
 *  with metadata about how the expression was produced. */
export interface HistoryEntry {
  id: string;
  timestamp: number;

  /** Normalized armação (the expression line shown above the result). */
  expression: string;

  /** Dimension. Drives icon/label and re-evaluation hints. */
  dimension: DimensionType;

  /** Pre-formatted display strings — same shape as a fresh CalculationResult. */
  primary: VisorSide;
  secondary: VisorSide | null;

  /** True when input mixed imperial + metric (changes how the visor labels
   *  the secondary block). */
  mixedSystems: boolean;

  isApproximate: boolean;
  exactForm: string | null;

  /** How the expression entered the app. */
  inputMethod?: 'manual' | 'voice';
  /** Raw Whisper transcription, when inputMethod === 'voice' and user consented. */
  transcription?: string;
  /** Server-side voice_log UUID, when the voice pipeline persisted a row. */
  voiceLogId?: string;
}
