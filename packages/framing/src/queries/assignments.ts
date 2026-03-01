import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmPhaseAssignment, PhaseAssignmentStatus } from '../types/carried-over'
import type { PhaseId } from '../types/phase'

const TABLE = 'frm_phase_assignments'

export interface CreateAssignmentInput {
  lot_id: string
  phase_id: PhaseId
  crew_id: string
  notes?: string
  organization_id?: string
}

/** List assignments for a jobsite (joins lot + crew) */
export async function listAssignmentsByJobsite(supabase: SupabaseClient, jobsiteId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      lot:frm_lots!inner(id, lot_number, jobsite_id, status),
      crew:frm_crews(id, name)
    `)
    .eq('lot.jobsite_id', jobsiteId)
    .order('lot_id')

  if (error) throw error
  return data as Array<FrmPhaseAssignment & {
    lot: { id: string; lot_number: string; jobsite_id: string; status: string }
    crew: { id: string; name: string } | null
  }>
}

/** List assignments for a specific lot */
export async function listAssignmentsByLot(supabase: SupabaseClient, lotId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      crew:frm_crews(id, name, phone),
      phase:frm_phases(id, name, order_index)
    `)
    .eq('lot_id', lotId)
    .order('phase_id')

  if (error) throw error
  return data as Array<FrmPhaseAssignment & {
    crew: { id: string; name: string; phone: string | null } | null
    phase: { id: string; name: string; order_index: number } | null
  }>
}

/** Assign a crew to a phase on a lot */
export async function createAssignment(supabase: SupabaseClient, input: CreateAssignmentInput) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      lot_id: input.lot_id,
      phase_id: input.phase_id,
      crew_id: input.crew_id,
      status: 'assigned',
      notes: input.notes ?? null,
      organization_id: input.organization_id ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmPhaseAssignment
}

/** Bulk assign a crew to multiple phases on a lot */
export async function bulkAssign(
  supabase: SupabaseClient,
  lotId: string,
  crewId: string,
  phaseIds: PhaseId[],
  organizationId?: string,
) {
  const rows = phaseIds.map(phaseId => ({
    lot_id: lotId,
    phase_id: phaseId,
    crew_id: crewId,
    status: 'assigned' as const,
    organization_id: organizationId ?? null,
  }))

  const { data, error } = await supabase
    .from(TABLE)
    .insert(rows)
    .select()

  if (error) throw error
  return data as FrmPhaseAssignment[]
}

/** Update assignment status */
export async function updateAssignmentStatus(
  supabase: SupabaseClient,
  id: string,
  status: PhaseAssignmentStatus,
) {
  const timestamps: Record<string, string | null> = {}
  if (status === 'started') timestamps.started_at = new Date().toISOString()
  if (status === 'completed') timestamps.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, ...timestamps })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmPhaseAssignment
}

/** Reassign a phase to a different crew */
export async function reassignCrew(supabase: SupabaseClient, id: string, newCrewId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ crew_id: newCrewId, status: 'assigned', started_at: null, completed_at: null })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmPhaseAssignment
}

/** Delete an assignment */
export async function deleteAssignment(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}
