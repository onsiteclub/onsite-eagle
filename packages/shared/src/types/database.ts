export interface Site {
  id: string
  name: string
  address: string
  city: string
  svg_data: string | null
  created_at: string
  updated_at: string
}

export interface House {
  id: string
  site_id: string
  lot_number: string
  address: string | null
  status: HouseStatus
  current_phase: number
  progress_percentage: number
  coordinates: { x: number; y: number } | null
  qr_code_data: string | null
  created_at: string
  updated_at: string
}

export type HouseStatus = 'not_started' | 'in_progress' | 'delayed' | 'completed' | 'on_hold'

export interface Phase {
  id: string
  name: string
  order_index: number
  description: string | null
  required_photos: number
  ai_checklist: string[]
}

export interface PhaseItem {
  id: string
  phase_id: string
  name: string
  description: string | null
  is_critical: boolean
}

export interface HouseProgress {
  id: string
  house_id: string
  phase_id: string
  status: ProgressStatus
  approved_at: string | null
  approved_by: string | null
  notes: string | null
}

export type ProgressStatus = 'pending' | 'in_progress' | 'ai_review' | 'approved' | 'rejected'

export interface PhasePhoto {
  id: string
  house_id: string
  phase_id: string
  uploaded_by: string
  photo_url: string
  thumbnail_url: string | null
  ai_validation_status: ValidationStatus
  ai_validation_notes: string | null
  ai_detected_items: string[] | null
  signature: PhotoSignature | null
  created_at: string
}

export type ValidationStatus = 'pending' | 'approved' | 'rejected' | 'needs_review'

// Electronic signature for photos
export interface PhotoSignature {
  user_id: string
  user_name: string
  user_role: 'worker' | 'foreman' | 'manager'
  signed_at: string
  device_id?: string
  location?: { latitude: number; longitude: number }
  hash: string
}

export interface TimelineEvent {
  id: string
  house_id: string
  event_type: EventType
  title: string
  description: string | null
  source: string | null
  source_link: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  author?: TimelineAuthor | null
  signature?: PhotoSignature | null
  created_at: string
}

export interface TimelineAuthor {
  id: string
  name: string
  role: 'worker' | 'foreman' | 'manager' | 'system'
  avatar?: string
}

export type EventType = 'photo' | 'email' | 'calendar' | 'note' | 'alert' | 'ai_validation' | 'status_change' | 'issue' | 'inspection' | 'assignment' | 'milestone' | 'document'

export interface Issue {
  id: string
  house_id: string
  phase_id: string | null
  reported_by: string
  title: string
  description: string | null
  severity: IssueSeverity
  status: IssueStatus
  photo_urls: string[] | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
}

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IssueStatus = 'open' | 'in_progress' | 'resolved'

// ==========================================
// QR Code Assignment Types
// ==========================================

export interface HouseAssignment {
  id: string
  house_id: string
  worker_id: string
  assigned_by: string // Foreman ID
  assigned_at: string
  expected_start_date: string
  expected_end_date: string
  actual_start_date: string | null
  actual_end_date: string | null
  status: AssignmentStatus
  plan_urls: string[]
  notes: string | null
  signature: AssignmentSignature | null
}

export type AssignmentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

export interface AssignmentSignature {
  worker_signed_at: string | null
  worker_signature_hash: string | null
  foreman_signed_at: string
  foreman_signature_hash: string
}

// QR Code data structure
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
// Lot Map Types (Icons instead of colors)
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
  status: HouseStatus
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
