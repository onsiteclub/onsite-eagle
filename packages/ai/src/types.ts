export interface AIRequest {
  /** Specialist ID: 'timekeeper:secretary', 'timekeeper:voice', 'calculator:voice', etc. */
  specialist: string;
  /** App-specific context passed to the specialist prompt */
  context: Record<string, unknown>;
  /** Optional conversation messages for multi-turn */
  messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
}

export interface AIResponse {
  action: string;
  data: Record<string, unknown>;
  response_text: string;
}

export interface WhisperResult {
  text: string;
  language: string;
  duration_ms: number;
}

export interface WorkerProfile {
  avg_entry: string;
  avg_exit: string;
  avg_shift_hours: number;
  avg_break_min: number;
  data_points: number;
  pattern: 'regular' | 'variable' | 'shift_work' | 'insufficient_data';
}
