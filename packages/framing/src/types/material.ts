import type { PhaseId } from './phase'

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'
export type MaterialRequestStatus = 'requested' | 'authorized' | 'acknowledged' | 'in_transit' | 'delivered' | 'cancelled'
export type EquipmentRequestStatus = 'requested' | 'accepted' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type EquipmentPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface UrgencyFactors {
  explicit_urgency: number
  phase_blocking: number
  schedule_deviation: number
  lot_priority: number
}

export interface FrmMaterialRequest {
  id: string
  organization_id: string | null
  lot_id: string
  phase_id: PhaseId
  jobsite_id: string | null
  material_type: string | null
  material_name: string | null
  quantity: number | null
  unit: string
  notes: string | null
  urgency_level: UrgencyLevel
  urgency_score: number
  urgency_reason: string | null
  urgency_factors: UrgencyFactors | null
  requested_by: string
  requested_by_name: string | null
  authorized_by: string | null
  authorized_at: string | null
  operator_id: string | null
  status: MaterialRequestStatus
  requested_at: string
  acknowledged_at: string | null
  in_transit_at: string | null
  delivered_at: string | null
  delivered_by_id: string | null
  delivered_by_name: string | null
  delivery_notes: string | null
  delivery_location: string | null
  cancelled_by_id: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface FrmEquipmentRequest {
  id: string
  organization_id: string | null
  lot_id: string
  phase_id: PhaseId
  requested_by: string
  operator_id: string | null
  operation_type: string
  description: string | null
  status: EquipmentRequestStatus
  priority: EquipmentPriority
  requested_at: string
  scheduled_at: string | null
  completed_at: string | null
}
