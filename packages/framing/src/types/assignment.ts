import type { PhaseId } from './phase'

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
