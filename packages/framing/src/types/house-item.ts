import type { PhaseId } from './phase'

export type ItemType =
  | 'deficiency'
  | 'safety'
  | 'damage'
  | 'missing'
  | 'rework'
  | 'note'

export type ItemSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ItemStatus = 'open' | 'in_progress' | 'resolved'

export interface FrmHouseItem {
  id: string
  organization_id: string | null
  lot_id: string
  phase_id: PhaseId | null
  crew_id: string | null
  type: ItemType
  severity: ItemSeverity
  title: string
  description: string | null
  photo_url: string // NOT NULL — photo is mandatory
  reported_by: string
  reported_at: string
  status: ItemStatus
  blocking: boolean
  resolved_by: string | null
  resolved_at: string | null
  resolved_photo: string | null
  resolution_note: string | null
  gate_check_id: string | null
}
