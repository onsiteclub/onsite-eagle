import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmPhasePayment, PaymentStatus, HoldbackStatus } from '../types/payment'
import type { PhaseId } from '../types/phase'

const TABLE = 'frm_phase_payments'

export interface CreatePaymentInput {
  lot_id: string
  phase_id: PhaseId
  crew_id: string
  sqft: number
  rate_per_sqft: number
  organization_id?: string
  notes?: string
}

export interface ApprovePaymentInput {
  approved_by: string
  deductions?: number
  extras?: number
  notes?: string
}

/** List payments for a lot (with crew info) */
export async function listPaymentsByLot(supabase: SupabaseClient, lotId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      crew:frm_crews(id, name),
      phase:frm_phases(id, name, order_index)
    `)
    .eq('lot_id', lotId)
    .order('phase_id')

  if (error) throw error
  return data as Array<FrmPhasePayment & {
    crew: { id: string; name: string } | null
    phase: { id: string; name: string; order_index: number } | null
  }>
}

/** List payments for a crew (all lots) */
export async function listPaymentsByCrew(supabase: SupabaseClient, crewId: string, status?: PaymentStatus) {
  let query = supabase
    .from(TABLE)
    .select(`
      *,
      lot:frm_lots(id, lot_number, address, jobsite_id),
      phase:frm_phases(id, name, order_index)
    `)
    .eq('crew_id', crewId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data as Array<FrmPhasePayment & {
    lot: { id: string; lot_number: string; address: string | null; jobsite_id: string } | null
    phase: { id: string; name: string; order_index: number } | null
  }>
}

/** List payments for a jobsite (via lot join) */
export async function listPaymentsByJobsite(
  supabase: SupabaseClient,
  jobsiteId: string,
  filters?: { status?: PaymentStatus; crewId?: string },
) {
  let query = supabase
    .from(TABLE)
    .select(`
      *,
      lot:frm_lots!inner(id, lot_number, address, jobsite_id),
      crew:frm_crews(id, name),
      phase:frm_phases(id, name, order_index)
    `)
    .eq('lot.jobsite_id', jobsiteId)
    .order('lot_id')

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.crewId) query = query.eq('crew_id', filters.crewId)

  const { data, error } = await query
  if (error) throw error
  return data as Array<FrmPhasePayment & {
    lot: { id: string; lot_number: string; address: string | null; jobsite_id: string }
    crew: { id: string; name: string } | null
    phase: { id: string; name: string; order_index: number } | null
  }>
}

/** Get a single payment by ID */
export async function getPayment(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      lot:frm_lots(id, lot_number, address, jobsite_id, total_sqft),
      crew:frm_crews(id, name, phone),
      phase:frm_phases(id, name, order_index)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FrmPhasePayment & {
    lot: { id: string; lot_number: string; address: string | null; jobsite_id: string; total_sqft: number | null } | null
    crew: { id: string; name: string; phone: string | null } | null
    phase: { id: string; name: string; order_index: number } | null
  }
}

/**
 * Create a payment entry.
 * Typically auto-created when a crew is assigned to a phase.
 * `total` and `final_amount` are GENERATED columns — do NOT set them.
 */
export async function createPayment(supabase: SupabaseClient, input: CreatePaymentInput) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      lot_id: input.lot_id,
      phase_id: input.phase_id,
      crew_id: input.crew_id,
      sqft: input.sqft,
      rate_per_sqft: input.rate_per_sqft,
      status: 'unpaid',
      deductions: 0,
      extras: 0,
      notes: input.notes ?? null,
      organization_id: input.organization_id ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmPhasePayment
}

/** Approve a payment with optional deductions/extras */
export async function approvePayment(supabase: SupabaseClient, id: string, input: ApprovePaymentInput) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'approved',
      approved_by: input.approved_by,
      approved_at: new Date().toISOString(),
      deductions: input.deductions ?? 0,
      extras: input.extras ?? 0,
      notes: input.notes ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmPhasePayment
}

/** Mark a payment as paid */
export async function markPaymentPaid(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmPhasePayment
}

/** Update payment status (generic) */
export async function updatePaymentStatus(supabase: SupabaseClient, id: string, status: PaymentStatus) {
  const timestamps: Record<string, string | null> = {}
  if (status === 'approved') timestamps.approved_at = new Date().toISOString()
  if (status === 'paid') timestamps.paid_at = new Date().toISOString()

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, ...timestamps })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmPhasePayment
}

/** Get payment summary stats for a jobsite */
export async function getPaymentSummary(supabase: SupabaseClient, jobsiteId: string) {
  // First get lot IDs for this jobsite, then query payments
  const { data: lots } = await supabase
    .from('frm_lots')
    .select('id')
    .eq('jobsite_id', jobsiteId)

  if (!lots || lots.length === 0) {
    return { total_count: 0, unpaid: { count: 0, amount: 0 }, pending: { count: 0, amount: 0 }, approved: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, total_amount: 0 }
  }

  const lotIds = lots.map((l: { id: string }) => l.id)

  const { data, error } = await supabase
    .from(TABLE)
    .select('status, final_amount')
    .in('lot_id', lotIds)

  if (error) throw error

  const payments = data as Array<{ status: string; final_amount: number }>

  const summary = {
    total_count: payments.length,
    unpaid: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    total_amount: 0,
  }

  for (const p of payments) {
    const key = p.status as PaymentStatus
    if (key in summary) {
      (summary[key] as { count: number; amount: number }).count++
      ;(summary[key] as { count: number; amount: number }).amount += p.final_amount ?? 0
    }
    summary.total_amount += p.final_amount ?? 0
  }

  return summary
}

/** Delete a payment */
export async function deletePayment(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ==========================================
// Holdback / Retention
// ==========================================

/** Release holdback for a payment (foreman confirms work complete) */
export async function releaseHoldback(
  supabase: SupabaseClient,
  paymentId: string,
  releasedBy: string,
  notes?: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      holdback_status: 'released',
      holdback_released_at: new Date().toISOString(),
      holdback_released_by: releasedBy,
      holdback_notes: notes ?? null,
    })
    .eq('id', paymentId)
    .eq('holdback_status', 'held')
    .select()
    .single()

  if (error) throw error
  return data as FrmPhasePayment
}

/** Reassign holdback to a different crew (original crew didn't finish) */
export async function reassignHoldback(
  supabase: SupabaseClient,
  paymentId: string,
  newCrewId: string,
  releasedBy: string,
  notes: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      holdback_status: 'reassigned',
      holdback_reassigned_to: newCrewId,
      holdback_released_at: new Date().toISOString(),
      holdback_released_by: releasedBy,
      holdback_notes: notes,
    })
    .eq('id', paymentId)
    .eq('holdback_status', 'held')
    .select()
    .single()

  if (error) throw error
  return data as FrmPhasePayment
}

/** List all held holdbacks for a lot (eligible for release after gate check) */
export async function listHoldbacksByLot(supabase: SupabaseClient, lotId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      crew:frm_crews(id, name),
      phase:frm_phases(id, name, order_index)
    `)
    .eq('lot_id', lotId)
    .eq('holdback_status', 'held')
    .order('phase_id')

  if (error) throw error
  return data as Array<FrmPhasePayment & {
    crew: { id: string; name: string } | null
    phase: { id: string; name: string; order_index: number } | null
  }>
}

/** Get holdback summary stats for a jobsite */
export async function getHoldbackSummary(supabase: SupabaseClient, jobsiteId: string) {
  const { data: lots } = await supabase
    .from('frm_lots')
    .select('id')
    .eq('jobsite_id', jobsiteId)

  if (!lots || lots.length === 0) {
    return { held: { count: 0, amount: 0 }, released: { count: 0, amount: 0 }, reassigned: { count: 0, amount: 0 }, total_holdback: 0 }
  }

  const lotIds = lots.map((l: { id: string }) => l.id)

  const { data, error } = await supabase
    .from(TABLE)
    .select('holdback_status, holdback_amount')
    .in('lot_id', lotIds)
    .neq('holdback_status', 'none')

  if (error) throw error

  const payments = data as Array<{ holdback_status: HoldbackStatus; holdback_amount: number }>

  const summary = {
    held: { count: 0, amount: 0 },
    released: { count: 0, amount: 0 },
    reassigned: { count: 0, amount: 0 },
    total_holdback: 0,
  }

  for (const p of payments) {
    const key = p.holdback_status as keyof typeof summary
    if (key in summary && key !== 'total_holdback') {
      (summary[key] as { count: number; amount: number }).count++
      ;(summary[key] as { count: number; amount: number }).amount += p.holdback_amount ?? 0
    }
    summary.total_holdback += p.holdback_amount ?? 0
  }

  return summary
}
