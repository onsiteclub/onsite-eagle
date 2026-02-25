/**
 * @onsite/voice — Shared voice types
 *
 * Types used by Calculator (web), Timekeeper (native), and future voice-enabled apps.
 */

/** Voice recording/processing state machine */
export type VoiceState = 'idle' | 'recording' | 'processing';

/** Consent types relevant to voice features */
export type VoiceConsentType =
  | 'microphone_usage'  // Required — App Store/Play Store compliance
  | 'voice_training';   // Optional — allow anonymized data for ML training

/** All consent types (superset including non-voice) */
export type ConsentType =
  | VoiceConsentType
  | 'data_analytics'
  | 'marketing'
  | 'terms_of_service'
  | 'privacy_policy';

/** Response from voice interpretation (Whisper + GPT) */
export interface VoiceResponse {
  expression: string;
  error?: string;
  voice_log_id?: string;
}

/** Voice log record for core_voice_logs table */
export interface VoiceLogRecord {
  id?: string;
  user_id?: string;
  app_name?: string;
  feature_context?: string;
  session_id?: string;
  audio_duration_ms?: number;
  audio_format?: string;
  transcription_raw?: string;
  transcription_normalized?: string;
  transcription_engine?: string;
  language_detected?: string;
  intent_detected?: string;
  intent_fulfilled?: boolean;
  entities?: Record<string, unknown>;
  informal_terms?: string[];
  was_successful: boolean;
  error_type?: string;
  error_message?: string;
  device_model?: string;
  os?: string;
  app_version?: string;
  client_timestamp?: string;
}

/** Options for useVoiceRecorder hook */
export interface VoiceRecorderOptions {
  onRecordingComplete: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
}

/** Return type for useVoiceRecorder hook */
export interface VoiceRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

/** Return type for useVoiceUsage hook */
export interface VoiceUsageReturn {
  usageCount: number;
  remainingUses: number;
  hasReachedLimit: boolean;
  incrementUsage: () => Promise<void>;
  resetUsage: () => Promise<void>;
}

/** Minimal Supabase client interface (avoids tight coupling) */
export interface SupabaseClient {
  from(table: string): {
    select(columns?: string): any;
    insert(values: any): any;
    upsert(values: any, options?: any): any;
    delete(): any;
  };
}
