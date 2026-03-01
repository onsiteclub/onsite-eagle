import type { PhaseId } from './phase'

export interface FrmTradePause {
  id: string
  organization_id: string | null
  lot_id: string
  started_at: string
  expected_end: string | null
  ended_at: string | null
  trades_in: string[]
  notes: string | null
}

export interface FrmThirdPartyEntry {
  id: string
  organization_id: string | null
  lot_id: string
  phase_id: PhaseId | null
  company: string
  purpose: string
  entered_at: string
  exited_at: string | null
  authorized_by: string | null
  notes: string | null
}

export type ReturnVisitStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled'

export interface FrmReturnVisit {
  id: string
  organization_id: string | null
  lot_id: string
  crew_id: string | null
  reason: string
  requested_by: string | null
  assigned_to: string | null
  status: ReturnVisitStatus
  scheduled_at: string | null
  completed_at: string | null
  photo_before: string | null
  photo_after: string | null
  notes: string | null
  created_at: string
}
