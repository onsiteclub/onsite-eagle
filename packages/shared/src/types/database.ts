export interface Site {
  id: string
  organization_id: string | null // Multi-tenancy
  name: string
  address: string
  city: string
  svg_data: string | null
  total_lots: number
  completed_lots: number
  start_date: string | null
  expected_end_date: string | null
  created_at: string
  updated_at: string
}

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

export interface House {
  id: string
  organization_id: string | null // Multi-tenancy
  site_id: string
  lot_number: string
  address: string | null
  status: HouseStatus
  current_phase: number
  progress_percentage: number
  coordinates: { x: number; y: number; width?: number; height?: number } | null
  qr_code_data: string | null
  // Square footage (for billing)
  sqft_main_floors: number
  sqft_roof: number
  sqft_basement: number
  sqft_total: number // Computed
  // Schedule fields
  priority_score: number | null
  target_date: string | null
  closing_date: string | null
  buyer_name: string | null
  buyer_contact: string | null
  schedule_notes: string | null
  is_sold: boolean | null
  // Lot issuance (worker assignment)
  is_issued: boolean
  issued_at: string | null
  issued_to_worker_id: string | null
  issued_to_worker_name: string | null
  issued_by: string | null
  created_at: string
  updated_at: string
}

// Site worker (linked to jobsite, can work multiple lots)
export interface SiteWorker {
  id: string
  site_id: string
  worker_id: string | null // Optional: references core_profiles if worker has account
  worker_name: string
  worker_phone: string | null
  worker_email: string | null
  trade: string | null
  company_name: string | null
  is_active: boolean
  linked_at: string
  linked_by: string | null
  created_at: string
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
  organization_id: string | null // Multi-tenancy
  house_id: string
  phase_id: string
  uploaded_by: string
  photo_url: string
  thumbnail_url: string | null
  ai_validation_status: ValidationStatus
  ai_validation_notes: string | null
  ai_detected_items: string[] | null
  ai_confidence: number | null
  signature: PhotoSignature | null
  // Prumo training metadata
  metadata: PhotoMetadata
  schema_version: number
  quality_score: number | null
  is_training_eligible: boolean
  photo_type: PhotoType
  created_at: string
}

export type PhotoType = 'progress' | 'detail' | 'issue' | 'overview' | 'completion'

export interface PhotoMetadata {
  device_model?: string
  gps_accuracy?: number // meters
  capture_conditions?: {
    lighting?: 'natural' | 'artificial' | 'mixed' | 'low'
    weather?: 'clear' | 'cloudy' | 'rain' | 'snow'
  }
  compass_heading?: number
  altitude?: number
  [key: string]: unknown
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

// ==========================================
// Material Request Types
// ==========================================

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'
export type MaterialRequestStatus = 'pending' | 'acknowledged' | 'in_transit' | 'delivered' | 'cancelled'

export interface UrgencyFactors {
  explicit_urgency: number      // 0-100 from user selection
  schedule_deviation: number    // 0-100 if lot is behind
  lot_priority: number          // 0-100 from house.priority_score
}

export interface MaterialRequest {
  id: string
  site_id: string
  house_id: string | null
  material_type: string
  material_name: string
  quantity: number
  unit: string
  notes: string | null
  urgency_level: UrgencyLevel
  urgency_score: number
  urgency_reason: string | null
  urgency_factors: UrgencyFactors | null
  status: MaterialRequestStatus
  requested_by_id: string | null
  requested_by_name: string
  requested_by_role: string | null
  acknowledged_by_id: string | null
  acknowledged_at: string | null
  in_transit_at: string | null
  delivered_by_id: string | null
  delivered_by_name: string | null
  delivered_at: string | null
  delivery_notes: string | null
  delivery_location: string | null
  cancelled_by_id: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined fields (optional)
  house?: House
  site?: Site
  lot_number?: string
  site_name?: string
}

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

export interface OperatorAssignment {
  id: string
  operator_id: string
  site_id: string
  is_active: boolean
  assigned_at: string
  assigned_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Constants for material request UI
export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  critical: '#FF3B30',
  high: '#FF9500',
  medium: '#FFCC00',
  low: '#8E8E93'
}

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  critical: 'Critical - Blocking work NOW',
  high: 'High - Needed within hours',
  medium: 'Medium - Needed today',
  low: 'Low - Can wait 24+ hours'
}

export const MATERIAL_REQUEST_STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  pending: 'Pending',
  acknowledged: 'Acknowledged',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
}

// ==========================================
// Document Types (Bulk Upload System)
// ==========================================

export type DocumentCategory = 'blueprint' | 'permit' | 'inspection' | 'contract' | 'plan' | 'other'
export type DocumentLinkType = 'auto_parsed' | 'manual'
export type BatchStatus = 'processing' | 'reviewing' | 'completed' | 'failed'

export interface Document {
  id: string
  site_id: string
  house_id: string | null // Legacy direct link
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
  // Bulk upload fields
  parsed_lot_number: string | null
  parsing_confidence: number | null
  batch_id: string | null
  // Metadata
  uploaded_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DocumentLink {
  id: string
  document_id: string
  house_id: string
  link_type: DocumentLinkType
  show_in_timeline: boolean
  created_at: string
  created_by: string | null
  // Joined fields (from view)
  document?: Document
  house?: House
}

export interface DocumentBatch {
  id: string
  site_id: string
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

// View type for lot documents (read-only)
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
  link_type: DocumentLinkType
  show_in_timeline: boolean
  uploaded_at: string
}

// Parsed filename result
export interface ParsedFilename {
  lotNumbers: string[]
  documentType: string | null
  confidence: number
}

// Bulk upload preview item
export interface BulkUploadItem {
  file: File
  filename: string
  parsed: ParsedFilename
  status: 'pending' | 'uploading' | 'linked' | 'unlinked' | 'error'
  documentId?: string
  error?: string
  // User can edit
  editedLotNumber?: string
}
