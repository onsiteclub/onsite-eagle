import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmEquipmentRequest, EquipmentRequestStatus, EquipmentPriority } from '../types/material'
import type { PhaseId } from '../types/phase'

const TABLE = 'frm_equipment_requests'

export interface CreateEquipmentRequestInput {
  lot_id: string
  phase_id: PhaseId
  requested_by: string
  operation_type: string
  description?: string
  priority?: EquipmentPriority
  organization_id?: string
}

/** List equipment requests for a jobsite (via lot join) */
export async function listEquipmentByJobsite(supabase: SupabaseClient, jobsiteId: string, status?: EquipmentRequestStatus) {
  let query = supabase
    .from(TABLE)
    .select(`
      *,
      lot:frm_lots!inner(id, lot_number, address, jobsite_id),
      phase:frm_phases(id, name)
    `)
    .eq('lot.jobsite_id', jobsiteId)
    .order('requested_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data as Array<FrmEquipmentRequest & {
    lot: { id: string; lot_number: string; address: string | null; jobsite_id: string }
    phase: { id: string; name: string } | null
  }>
}

/** List equipment requests assigned to an operator */
export async function listEquipmentByOperator(supabase: SupabaseClient, operatorId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      lot:frm_lots(id, lot_number, address, jobsite_id,
        jobsite:frm_jobsites(id, name)
      ),
      phase:frm_phases(id, name)
    `)
    .eq('operator_id', operatorId)
    .in('status', ['accepted', 'scheduled', 'in_progress'])
    .order('priority', { ascending: true })
    .order('requested_at', { ascending: true })

  if (error) throw error
  return data as Array<FrmEquipmentRequest & {
    lot: { id: string; lot_number: string; address: string | null; jobsite_id: string; jobsite: { id: string; name: string } | null } | null
    phase: { id: string; name: string } | null
  }>
}

/** Get operator's equipment queue (pending requests from assigned jobsites) */
export async function getEquipmentQueue(supabase: SupabaseClient, operatorId: string) {
  // Get operator's assigned jobsite IDs
  const { data: assignments } = await supabase
    .from('frm_operator_assignments')
    .select('jobsite_id')
    .eq('operator_id', operatorId)
    .eq('is_active', true)

  if (!assignments || assignments.length === 0) return []

  const jobsiteIds = assignments.map((a: { jobsite_id: string }) => a.jobsite_id)

  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      lot:frm_lots!inner(id, lot_number, address, jobsite_id,
        jobsite:frm_jobsites(id, name)
      ),
      phase:frm_phases(id, name)
    `)
    .in('lot.jobsite_id', jobsiteIds)
    .in('status', ['requested', 'accepted', 'scheduled', 'in_progress'])
    .order('requested_at', { ascending: true })

  if (error) throw error
  return data as Array<FrmEquipmentRequest & {
    lot: { id: string; lot_number: string; address: string | null; jobsite_id: string; jobsite: { id: string; name: string } | null }
    phase: { id: string; name: string } | null
  }>
}

/** Create an equipment request */
export async function createEquipmentRequest(supabase: SupabaseClient, input: CreateEquipmentRequestInput) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      lot_id: input.lot_id,
      phase_id: input.phase_id,
      requested_by: input.requested_by,
      operation_type: input.operation_type,
      description: input.description ?? null,
      priority: input.priority ?? 'normal',
      status: 'requested',
      organization_id: input.organization_id ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmEquipmentRequest
}

/** Accept an equipment request (operator takes it) */
export async function acceptEquipmentRequest(supabase: SupabaseClient, id: string, operatorId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'accepted',
      operator_id: operatorId,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmEquipmentRequest
}

/** Schedule an equipment request */
export async function scheduleEquipmentRequest(supabase: SupabaseClient, id: string, scheduledAt: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'scheduled',
      scheduled_at: scheduledAt,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmEquipmentRequest
}

/** Start working on an equipment request */
export async function startEquipmentRequest(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: 'in_progress' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmEquipmentRequest
}

/** Complete an equipment request */
export async function completeEquipmentRequest(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmEquipmentRequest
}

/** Cancel an equipment request */
export async function cancelEquipmentRequest(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmEquipmentRequest
}

/** Common equipment operation types */
export const EQUIPMENT_TYPES = [
  { code: 'crane', label: 'Crane' },
  { code: 'telehandler', label: 'Telehandler' },
  { code: 'forklift', label: 'Forklift' },
  { code: 'boom_lift', label: 'Boom Lift' },
  { code: 'scissor_lift', label: 'Scissor Lift' },
  { code: 'concrete_pump', label: 'Concrete Pump' },
  { code: 'excavator', label: 'Excavator' },
  { code: 'dump_truck', label: 'Dump Truck' },
] as const
