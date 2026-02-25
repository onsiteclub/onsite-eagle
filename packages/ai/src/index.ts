// Core
export { callAI } from './core';

// Whisper
export { transcribeAudio } from './whisper';

// Types
export type { AIRequest, AIResponse, WhisperResult, WorkerProfile } from './types';

// Specialists
export { SECRETARY_PROMPT, VOICE_PROMPT } from './specialists/timekeeper';
export {
  PHASE_CHECKLISTS,
  buildPhotoValidationPrompt,
  buildPhotoAnalysisPrompt,
  DOCUMENT_EXTRACTION_PROMPT,
  WEEKLY_REPORT_PROMPT,
  EAGLE_PROMPT_VERSION,
} from './specialists/eagle';
export {
  VOICE_EXPRESSION_PROMPT,
  WHISPER_HINT,
  CALCULATOR_PROMPT_VERSION,
} from './specialists/calculator';
export {
  MEDIATION_PROMPT,
  MEDIATION_PROMPT_VERSION,
  buildMediationPrompt,
  parseMediationResult,
} from './specialists/mediator';
export type { MediationContext, ParsedMediationResult } from './specialists/mediator';
