import type { PhaseId } from './phase'

export type PaymentStatus = 'unpaid' | 'pending' | 'approved' | 'paid'

export interface FrmPhasePayment {
  id: string
  organization_id: string | null
  lot_id: string
  phase_id: PhaseId
  crew_id: string
  sqft: number
  rate_per_sqft: number
  total: number // GENERATED ALWAYS
  status: PaymentStatus
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  deductions: number
  extras: number
  final_amount: number // GENERATED ALWAYS
  notes: string | null
}
