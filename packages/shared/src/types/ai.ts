// Eagle AI Copilot Types
import type { IssueSeverity } from './database'

// Input types for AI Copilot
export type CopilotInputType = 'photo' | 'document' | 'form_assist'

export type FormType = 'inspection' | 'schedule' | 'issue' | 'general'

// Re-export for convenience
export type { IssueSeverity }

// Context provided to AI
export interface CopilotContext {
  siteId: string
  houseId?: string
  formType?: FormType
  existingData?: Record<string, unknown>
}

// Request to /api/ai-copilot
export interface CopilotRequest {
  type: CopilotInputType
  content: string // base64 for images/docs, JSON string for form_assist
  context: CopilotContext
}

// Timeline suggestion
export interface TimelineSuggestion {
  title: string
  description: string
  event_type: 'photo' | 'document' | 'note' | 'inspection' | 'status_change' | 'issue'
}

// Form field suggestion
export interface FormFieldSuggestion {
  [fieldName: string]: string | number | boolean | null
}

// Lot update suggestion
export interface LotUpdateSuggestion {
  status?: 'not_started' | 'in_progress' | 'delayed' | 'completed' | 'on_hold'
  current_phase?: number
  progress_percentage?: number
  priority_score?: number
  target_date?: string
  closing_date?: string
  buyer_name?: string
  schedule_notes?: string
  is_sold?: boolean
}

// Issue suggestion
export interface IssueSuggestion {
  title: string
  description: string
  severity: IssueSeverity
  phase_id?: string
  photo_urls?: string[]
}

// Checklist item detected in photo
export interface ChecklistItem {
  name: string
  present: boolean
  confidence?: number
  notes?: string
}

// All suggestions returned by AI
export interface CopilotSuggestions {
  timeline?: TimelineSuggestion
  form_fields?: FormFieldSuggestion
  lot_updates?: LotUpdateSuggestion
  issues?: IssueSuggestion[]
}

// Extracted data union type
export type ExtractedData = PhotoAnalysisResult | DocumentExtractionResult | FormAssistResult | Record<string, unknown>

// Full response from /api/ai-copilot
export interface CopilotResponse {
  success: boolean
  suggestions: CopilotSuggestions
  confidence: number
  extracted_data: ExtractedData
  ai_notes: string
  ai_model: string
  processing_time_ms: number
}

// Error response
export interface CopilotError {
  success: false
  error: string
  code?: string
}

// Photo analysis specific response
export interface PhotoAnalysisResult {
  detected_phase: string
  checklist_items: ChecklistItem[]
  issues: IssueSuggestion[]
  progress_estimate: number
  timeline_title: string
  timeline_description: string
  quality_score: number
  safety_concerns: string[]
}

// Document extraction specific response
export interface DocumentExtractionResult {
  document_type: string
  extracted_fields: Record<string, string | number | boolean>
  timeline_entry: TimelineSuggestion
  suggested_updates: LotUpdateSuggestion
  confidence: number
}

// Form assist specific response
export interface FormAssistResult {
  suggestions: FormFieldSuggestion
  reasoning: Record<string, string>
  confidence: number
}

// Hook state
export interface CopilotState {
  suggestions: CopilotSuggestions | null
  loading: boolean
  error: string | null
  confidence: number | null
  aiNotes: string | null
}

// Hook actions
export interface CopilotActions {
  analyze: (input: File | string, type: CopilotInputType) => Promise<void>
  applySuggestion: (category: keyof CopilotSuggestions, value?: unknown) => Promise<void>
  applyAll: () => Promise<void>
  dismiss: () => void
  clearError: () => void
}

// Full hook return type
export type UseCopilotReturn = CopilotState & CopilotActions
