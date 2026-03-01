import type { PhaseId } from './phase'

export type LotStatus =
  | 'pending'
  | 'released'
  | 'in_progress'
  | 'paused_for_trades'
  | 'backframe'
  | 'inspection'
  | 'completed'

export interface FrmLot {
  id: string
  organization_id: string | null
  jobsite_id: string
  lot_number: string
  block: string | null
  model: string | null
  address: string | null
  total_sqft: number | null
  sqft_main_floors: number | null
  sqft_roof: number | null
  sqft_basement: number | null
  status: LotStatus
  current_phase: PhaseId | null
  has_capping: boolean
  blueprint_url: string | null
  priority_score: number | null
  target_date: string | null
  closing_date: string | null
  buyer_name: string | null
  buyer_contact: string | null
  is_sold: boolean
  released_at: string | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  coordinates: { x: number; y: number; width?: number; height?: number } | null
  qr_code_data: string | null
  created_at: string
  updated_at: string
}
