// ==========================================
// Re-export from @onsite/framing with backward-compat aliases
// ==========================================

// Jobsite (was Site)
export type { FrmJobsite as Site } from '@onsite/framing'

// Lot (was House)
export type { FrmLot as House } from '@onsite/framing'
export type { LotStatus as HouseStatus } from '@onsite/framing'

// Phase
export type { FrmPhase as Phase } from '@onsite/framing'
export type { PhaseId } from '@onsite/framing'

// Progress (was HouseProgress)
export type { FrmProgress as HouseProgress } from '@onsite/framing'
export type { ProgressStatus } from '@onsite/framing'

// Photo (was PhasePhoto)
export type { FrmPhoto as PhasePhoto } from '@onsite/framing'
export type { PhotoType, ValidationStatus } from '@onsite/framing'

// Timeline (was TimelineEvent)
export type { FrmTimelineEvent as TimelineEvent } from '@onsite/framing'
export type { TimelineEventType as EventType } from '@onsite/framing'

// House Items (was Issue)
export type { FrmHouseItem as Issue } from '@onsite/framing'
export type { ItemSeverity as IssueSeverity } from '@onsite/framing'
export type { ItemStatus as IssueStatus } from '@onsite/framing'
export type { ItemType } from '@onsite/framing'

// Material Request
export type { FrmMaterialRequest as MaterialRequest } from '@onsite/framing'
export type { UrgencyLevel, MaterialRequestStatus } from '@onsite/framing'
export type { UrgencyFactors } from '@onsite/framing'

// Operator Assignment
export type { FrmOperatorAssignment as OperatorAssignment } from '@onsite/framing'

// Documents
export type { FrmDocument as Document } from '@onsite/framing'
export type { FrmDocumentLink as DocumentLink } from '@onsite/framing'
export type { FrmDocumentBatch as DocumentBatch } from '@onsite/framing'
export type { DocumentCategory, DocumentLinkType, BatchStatus } from '@onsite/framing'

// Site Workers
export type { FrmSiteWorker as SiteWorker } from '@onsite/framing'

// Assignments (was HouseAssignment)
export type { FrmAssignment as HouseAssignment } from '@onsite/framing'
export type { AssignmentStatus } from '@onsite/framing'

// Crews
export type { FrmCrew, FrmCrewWorker } from '@onsite/framing'

// Phase Assignments
export type { FrmPhaseAssignment, PhaseAssignmentStatus } from '@onsite/framing'

// Gate Checks
export type { FrmGateCheck, FrmGateCheckItem, FrmGateCheckTemplate } from '@onsite/framing'
export type { GateCheckResult, GateCheckStatus } from '@onsite/framing'

// Payments
export type { FrmPhasePayment, PaymentStatus } from '@onsite/framing'

// Equipment Requests
export type { FrmEquipmentRequest, EquipmentRequestStatus, EquipmentPriority } from '@onsite/framing'

// Warnings
export type { FrmWarning, WarningCategory, WarningPriority, WarningStatus, WarningTargetType } from '@onsite/framing'

// Safety
export type { FrmSafetyCheck, FrmCertification, SafetyCheckStatus, CertificationStatus } from '@onsite/framing'

// Schedules
export type { FrmSchedule, FrmSchedulePhase, ScheduleStatus, SchedulePhaseStatus } from '@onsite/framing'

// Messages
export type { FrmMessage } from '@onsite/framing'

// Re-export constants
export { URGENCY_COLORS, URGENCY_LABELS } from '@onsite/framing'
export { FRM_TABLES, FRM_MEDIA_BUCKET } from '@onsite/framing'

// ==========================================
// Constants kept in @onsite/shared
// ==========================================

export const MATERIAL_REQUEST_STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  authorized: 'Authorized',
  acknowledged: 'Acknowledged',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

// ==========================================
// UI-only types (not table types — no database equivalent)
// ==========================================

export interface PhotoSignature {
  user_id: string
  user_name: string
  user_role: 'worker' | 'foreman' | 'manager'
  signed_at: string
  device_id?: string
  location?: { latitude: number; longitude: number }
  hash: string
}

export interface PhotoMetadata {
  device_model?: string
  gps_accuracy?: number
  capture_conditions?: {
    lighting?: 'natural' | 'artificial' | 'mixed' | 'low'
    weather?: 'clear' | 'cloudy' | 'rain' | 'snow'
  }
  compass_heading?: number
  altitude?: number
  [key: string]: unknown
}

export interface TimelineAuthor {
  id: string
  name: string
  role: 'worker' | 'foreman' | 'manager' | 'system'
  avatar?: string
}

export interface AssignmentSignature {
  worker_signed_at: string | null
  worker_signature_hash: string | null
  foreman_signed_at: string
  foreman_signature_hash: string
}

export interface QRAssignmentData {
  type: 'house_assignment'
  version: 1
  house_id: string
  site_id: string
  lot_number: string
  assigned_by: string
  assigned_at: string
  expected_start_date: string
  expected_end_date: string
  plan_urls: string[]
  checksum: string
}

// ==========================================
// Lot Map Types
// ==========================================

export interface LotMapIcon {
  type: LotIconType
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  tooltip?: string
}

export type LotIconType =
  | 'worker_assigned'
  | 'worker_active'
  | 'photo_pending'
  | 'photo_approved'
  | 'issue_open'
  | 'issue_resolved'
  | 'inspection_due'
  | 'inspection_passed'
  | 'deadline_near'
  | 'deadline_overdue'
  | 'milestone'

export interface LotMapData {
  house_id: string
  lot_number: string
  coordinates: { x: number; y: number; width: number; height: number }
  status: string
  progress: number
  icons: LotMapIcon[]
  worker?: {
    id: string
    name: string
    avatar?: string
  }
  deadline?: string
  current_phase?: string
}

// ==========================================
// AI Analysis types
// ==========================================

export interface PlanAnalysisResult {
  lots: {
    lot_number: string
    coordinates: { x: number; y: number; width: number; height: number }
    confidence: number
  }[]
  streets: {
    name: string
    path: string
  }[]
  svg_output: string
}

export interface PhotoValidationResult {
  approved: boolean
  confidence: number
  detected_items: {
    name: string
    present: boolean
    confidence: number
    notes: string | null
  }[]
  missing_items: string[]
  quality_issues: string[]
  recommendation: 'approve' | 'request_new_photo' | 'needs_supervisor_review'
}

// ==========================================
// Document upload UI types
// ==========================================

export interface ParsedFilename {
  lotNumbers: string[]
  documentType: string | null
  confidence: number
}

export interface BulkUploadItem {
  file: File
  filename: string
  parsed: ParsedFilename
  status: 'pending' | 'uploading' | 'linked' | 'unlinked' | 'error'
  documentId?: string
  error?: string
  editedLotNumber?: string
}

// ==========================================
// Legacy types still used by AI checklist
// ==========================================

export interface PhaseItem {
  id: string
  phase_id: string
  name: string
  description: string | null
  is_critical: boolean
}

// ==========================================
// Material type reference
// ==========================================

export interface MaterialType {
  id: string
  code: string
  name_en: string
  name_pt: string | null
  category: string
  default_unit: string
  icon: string | null
  is_active: boolean
  sort_order: number
}

// ==========================================
// Legacy types (removed — were database types)
// These are no longer defined here. Use @onsite/framing directly.
//
// SiteContact, SiteDocument, SiteRule, SiteDate → not migrated yet (site-level UI types)
// HouseDocument → view type, kept as backward-compat below
// ==========================================

export interface SiteContact {
  id: string
  site_id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  company: string | null
  is_primary: boolean
}

export interface SiteDocument {
  id: string
  site_id: string
  name: string
  type: 'contract' | 'permit' | 'plan' | 'insurance' | 'other'
  url: string
  uploaded_by: string
  created_at: string
}

export interface SiteRule {
  id: string
  site_id: string
  title: string
  description: string
  category: 'safety' | 'schedule' | 'quality' | 'general'
}

export interface SiteDate {
  id: string
  site_id: string
  title: string
  date: string
  type: 'milestone' | 'deadline' | 'inspection' | 'meeting'
  notes: string | null
}

export interface HouseDocument {
  house_id: string
  link_id: string
  document_id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size_bytes: number | null
  document_type: string
  description: string | null
  uploaded_by: string | null
  link_type: string
  show_in_timeline: boolean
  uploaded_at: string
}
