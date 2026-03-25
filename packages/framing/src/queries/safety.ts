import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmSafetyCheck, SafetyCheckStatus } from '../types/safety'
import type { PhaseId } from '../types/phase'

const TABLE = 'frm_safety_checks'

/** List safety checks for a lot, optionally filtered by status */
export async function listSafetyChecks(
  supabase: SupabaseClient,
  lotId: string,
  status?: SafetyCheckStatus,
) {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('lot_id', lotId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data as FrmSafetyCheck[]
}

/** List ALL open safety checks for a jobsite (across all lots) */
export async function listOpenSafetyByJobsite(
  supabase: SupabaseClient,
  jobsiteId: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      lot:frm_lots!inner(id, lot_number, jobsite_id)
    `)
    .eq('lot.jobsite_id', jobsiteId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as (FrmSafetyCheck & { lot: { id: string; lot_number: string; jobsite_id: string } })[]
}

/** Create a safety check — blocking by default. Also creates a corresponding blocking house item. */
export async function createSafetyCheck(
  supabase: SupabaseClient,
  input: {
    lot_id: string
    phase_id?: PhaseId
    type: string
    description?: string
    photo_url: string
  },
  reportedBy: string,
  organizationId?: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      lot_id: input.lot_id,
      phase_id: input.phase_id ?? null,
      type: input.type,
      description: input.description ?? null,
      photo_url: input.photo_url,
      reported_by: reportedBy,
      blocking: true, // safety is always blocking
      status: 'open',
      organization_id: organizationId ?? null,
    })
    .select()
    .single()

  if (error) throw error

  // Auto-create a blocking house item so canAdvancePhase picks it up
  await supabase
    .from('frm_house_items')
    .insert({
      lot_id: input.lot_id,
      phase_id: input.phase_id ?? null,
      type: 'safety',
      severity: 'critical',
      title: `Safety: ${input.type}`,
      description: input.description ?? null,
      photo_url: input.photo_url,
      reported_by: reportedBy,
      status: 'open',
      blocking: true,
      organization_id: organizationId ?? null,
    })

  return data as FrmSafetyCheck
}

/** Resolve a safety check — requires photo proof */
export async function resolveSafetyCheck(
  supabase: SupabaseClient,
  id: string,
  resolvedBy: string,
  resolvedPhoto: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'resolved',
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      resolved_photo: resolvedPhoto,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmSafetyCheck
}

/** Count open safety checks for a lot */
export async function countOpenSafetyChecks(
  supabase: SupabaseClient,
  lotId: string,
) {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('lot_id', lotId)
    .eq('status', 'open')

  if (error) throw error
  return count ?? 0
}
