// @onsite/voice — Shared voice infrastructure
//
// Consent, usage tracking, recording, and voice log persistence.

// Types
export type {
  VoiceState,
  VoiceConsentType,
  ConsentType,
  VoiceResponse,
  VoiceLogRecord,
  VoiceRecorderOptions,
  VoiceRecorderReturn,
  VoiceUsageReturn,
  SupabaseClient,
} from './types';

// Consent (client-side)
export {
  hasConsent,
  getConsentStatus,
  setConsent,
  canCollectVoice,
  getLocalConsentStatus,
  setLocalConsent,
} from './consent';

// Usage tracking
export { useVoiceUsage, MAX_FREE_USES } from './usage';
export type { VoiceUsageStorage } from './usage';

// Web recorder
export { useVoiceRecorder } from './recorder';
