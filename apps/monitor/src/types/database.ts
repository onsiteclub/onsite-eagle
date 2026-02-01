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
  status: 'not_started' | 'in_progress' | 'delayed' | 'completed'
  current_phase: number
  progress_percentage: number
  coordinates: { x: number; y: number } | null
  created_at: string
  updated_at: string
}

export interface Phase {
  id: string
  name: string
  order_index: number
  description: string | null
  required_photos: number
  ai_checklist: string[] // Items AI should verify
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
  status: 'pending' | 'in_progress' | 'ai_review' | 'approved' | 'rejected'
  approved_at: string | null
  approved_by: string | null
  notes: string | null
}

export interface PhasePhoto {
  id: string
  house_id: string
  phase_id: string
  uploaded_by: string
  photo_url: string
  thumbnail_url: string | null
  ai_validation_status: 'pending' | 'approved' | 'rejected' | 'needs_review'
  ai_validation_notes: string | null
  ai_detected_items: string[] | null
  created_at: string
}

export interface TimelineEvent {
  id: string
  house_id: string
  event_type: 'photo' | 'email' | 'calendar' | 'note' | 'alert' | 'ai_validation' | 'status_change'
  title: string
  description: string | null
  source: string | null
  source_link: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
}

export interface Issue {
  id: string
  house_id: string
  phase_id: string | null
  reported_by: string
  title: string
  description: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved'
  photo_urls: string[] | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
}

// AI Analysis types
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
  recommendation: string
}
