export type GateCheckTransition = 'framing_to_roofing' | 'roofing_to_trades' | 'trades_to_backframe' | 'backframe_to_final'
export type GateCheckResult = 'pending' | 'pass' | 'fail' | 'na'
export type GateCheckStatus = 'in_progress' | 'passed' | 'failed'

export interface FrmGateCheck {
  id: string
  organization_id: string | null
  lot_id: string
  transition: GateCheckTransition
  checked_by: string
  status: GateCheckStatus
  started_at: string
  completed_at: string | null
  released_at: string | null
}

export interface FrmGateCheckItem {
  id: string
  gate_check_id: string
  item_code: string
  item_label: string
  result: GateCheckResult
  photo_url: string | null
  notes: string | null
  deficiency_id: string | null
}

export interface FrmGateCheckTemplate {
  id: string
  transition: GateCheckTransition
  item_code: string
  item_label: string
  sort_order: number
  is_blocking: boolean
}
