import type { PhaseId } from './phase'

// ==========================================
// Photo (frm_photos)
// ==========================================
export type PhotoType = 'progress' | 'detail' | 'issue' | 'overview' | 'completion'
export type ValidationStatus = 'pending' | 'approved' | 'rejected' | 'needs_review'

export interface FrmPhoto {
  id: string
  organization_id: string | null
  lot_id: string
  phase_id: PhaseId | null
  uploaded_by: string | null
  photo_url: string
  thumbnail_url: string | null
  photo_type: PhotoType | null
  ai_validation_status: ValidationStatus
  ai_validation_notes: string | null
  ai_detected_items: unknown[] | null
  ai_confidence: number | null
  metadata: Record<string, unknown> | null
  quality_score: number | null
  is_training_eligible: boolean
  created_at: string
}

// ==========================================
// Timeline (frm_timeline)
// ==========================================
export type TimelineEventType =
  | 'photo' | 'email' | 'calendar' | 'note' | 'alert'
  | 'ai_validation' | 'status_change' | 'issue' | 'inspection'
  | 'assignment' | 'milestone' | 'document'

export interface FrmTimelineEvent {
  id: string
  organization_id: string | null
  lot_id: string
  event_type: TimelineEventType
  title: string
  description: string | null
  source: string | null
  source_link: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
}

// ==========================================
// Progress (frm_progress)
// ==========================================
export type ProgressStatus = 'pending' | 'in_progress' | 'ai_review' | 'approved' | 'rejected'

export interface FrmProgress {
  id: string
  organization_id: string | null
  lot_id: string
  phase_id: PhaseId
  status: ProgressStatus
  approved_at: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// Documents (frm_documents, frm_document_batches, frm_document_links)
// ==========================================
export type DocumentCategory = 'blueprint' | 'permit' | 'inspection' | 'contract' | 'plan' | 'other'
export type DocumentLinkType = 'auto_parsed' | 'manual'
export type BatchStatus = 'processing' | 'reviewing' | 'completed' | 'failed'

export interface FrmDocument {
  id: string
  organization_id: string | null
  jobsite_id: string | null
  lot_id: string | null
  name: string
  file_url: string
  file_path: string | null
  file_type: string | null
  file_size: number | null
  category: DocumentCategory
  description: string | null
  ai_analyzed: boolean
  ai_summary: string | null
  ai_extracted_data: Record<string, unknown> | null
  uploaded_by: string | null
  parsed_lot_number: string | null
  parsing_confidence: number | null
  batch_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface FrmDocumentBatch {
  id: string
  organization_id: string | null
  jobsite_id: string
  status: BatchStatus
  total_files: number
  processed_files: number
  linked_files: number
  unlinked_files: number
  failed_files: number
  uploaded_by: string | null
  uploaded_by_name: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface FrmDocumentLink {
  id: string
  organization_id: string | null
  document_id: string
  lot_id: string
  link_type: DocumentLinkType
  show_in_timeline: boolean
  created_by: string | null
  created_at: string
}

// ==========================================
// Messages (frm_messages)
// ==========================================
export interface FrmMessage {
  id: string
  organization_id: string | null
  jobsite_id: string
  lot_id: string | null
  sender_type: string
  sender_id: string | null
  sender_name: string
  sender_avatar_url: string | null
  content: string
  attachments: unknown[]
  is_ai_response: boolean
  ai_question: string | null
  ai_context: Record<string, unknown> | null
  ai_model: string | null
  metadata: Record<string, unknown>
  reply_to_id: string | null
  phase_at_creation: number
  created_at: string
}

// ==========================================
// Schedules (frm_schedules, frm_schedule_phases)
// ==========================================
export type ScheduleStatus = 'scheduled' | 'in_progress' | 'on_track' | 'at_risk' | 'delayed' | 'completed' | 'on_hold'
export type SchedulePhaseStatus = 'pending' | 'in_progress' | 'blocked' | 'inspection' | 'completed' | 'skipped'

export interface FrmSchedule {
  id: string
  organization_id: string | null
  jobsite_id: string | null
  lot_id: string
  template_name: string | null
  template_version: number
  expected_start_date: string
  expected_end_date: string
  expected_duration_days: number | null
  actual_start_date: string | null
  actual_end_date: string | null
  actual_duration_days: number | null
  status: ScheduleStatus
  deviation_days: number
  deviation_reason: string | null
  assigned_worker_id: string | null
  assigned_worker_name: string | null
  ai_risk_score: number | null
  ai_predicted_end_date: string | null
  ai_last_analyzed_at: string | null
  ai_analysis_notes: string | null
  created_at: string
  updated_at: string
}

export interface FrmSchedulePhase {
  id: string
  organization_id: string | null
  schedule_id: string
  phase_id: PhaseId
  expected_start_date: string | null
  expected_end_date: string | null
  expected_duration_days: number | null
  actual_start_date: string | null
  actual_end_date: string | null
  actual_duration_days: number | null
  status: SchedulePhaseStatus
  blocked_reason: string | null
  blocked_since: string | null
  payment_status: string
  payment_approved_at: string | null
  payment_approved_by: string | null
  payment_exported_at: string | null
  payment_notes: string | null
  depends_on_phases: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// External Events (frm_external_events)
// ==========================================
export interface FrmExternalEvent {
  id: string
  organization_id: string | null
  jobsite_id: string | null
  lot_id: string | null
  event_type: string
  title: string
  description: string | null
  event_date: string
  source: string | null
  impact_severity: string
  created_at: string
}

// ==========================================
// Scans (frm_scans)
// ==========================================
export interface FrmScan {
  id: string
  organization_id: string | null
  jobsite_id: string
  original_url: string
  file_type: string | null
  ai_processed: boolean
  ai_result: Record<string, unknown> | null
  generated_svg: string | null
  created_at: string
}

// ==========================================
// Site Workers (frm_site_workers)
// ==========================================
export interface FrmSiteWorker {
  id: string
  organization_id: string | null
  jobsite_id: string
  worker_id: string
  worker_name: string | null
  is_active: boolean
  assigned_by: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// Operator Assignments (frm_operator_assignments)
// ==========================================
export interface FrmOperatorAssignment {
  id: string
  organization_id: string | null
  operator_id: string
  jobsite_id: string
  is_active: boolean
  is_available: boolean
  available_since: string | null
  assigned_at: string
  assigned_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// AI Reports (frm_ai_reports)
// ==========================================
export interface FrmAiReport {
  id: string
  organization_id: string | null
  jobsite_id: string
  lot_id: string | null
  report_type: string
  title: string
  summary: string
  full_report: string
  sections: unknown[]
  period_start: string
  period_end: string
  metrics: Record<string, unknown>
  highlights: unknown[]
  recommendations: unknown[]
  ai_model: string | null
  ai_confidence: number | null
  generation_time_ms: number | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  sent_to: unknown[]
  created_at: string
}

// ==========================================
// Assignments (frm_assignments)
// ==========================================
export type AssignmentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

export interface FrmAssignment {
  id: string
  organization_id: string | null
  lot_id: string
  worker_id: string
  assigned_by: string | null
  assigned_at: string
  expected_start_date: string | null
  expected_end_date: string | null
  status: AssignmentStatus
  plan_urls: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// Material Tracking (frm_material_tracking)
// ==========================================
export type MaterialTrackingStatus = 'needed' | 'ordered' | 'delivered' | 'installed' | 'welded' | 'verified'

export interface FrmMaterialTracking {
  id: string
  organization_id: string | null
  lot_id: string
  jobsite_id: string | null
  phase_id: PhaseId | null
  material_type: string
  material_subtype: string | null
  description: string | null
  quantity: number
  unit: string
  length_inches: number | null
  status: MaterialTrackingStatus
  ordered_at: string | null
  ordered_by: string | null
  delivered_at: string | null
  installed_at: string | null
  installed_by: string | null
  welded_at: string | null
  verified_at: string | null
  verified_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// Phase Assignment (frm_phase_assignments)
// ==========================================
export type PhaseAssignmentStatus = 'assigned' | 'started' | 'completed'

export interface FrmPhaseAssignment {
  id: string
  organization_id: string | null
  lot_id: string
  phase_id: PhaseId
  crew_id: string
  status: PhaseAssignmentStatus
  assigned_at: string
  started_at: string | null
  completed_at: string | null
  notes: string | null
}
