import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmHouseItem, ItemType, ItemSeverity, ItemStatus } from '../types/house-item'
import type { PhaseId } from '../types/phase'

const TABLE = 'frm_house_items'

export interface CreateHouseItemInput {
  lot_id: string
  phase_id?: PhaseId | null
  type: ItemType
  severity: ItemSeverity
  title: string
  description?: string
  photo_url: string // mandatory
  blocking?: boolean
  gate_check_id?: string
  organization_id?: string
  // crew_id is auto-filled via routing helper — not provided by caller
}

export interface ResolveHouseItemInput {
  resolved_photo: string // mandatory
  resolution_note?: string
}

/** List items for a lot, optionally filtered */
export async function listHouseItems(
  supabase: SupabaseClient,
  lotId: string,
  filters?: {
    phase_id?: PhaseId
    crew_id?: string
    status?: ItemStatus
    type?: ItemType
    blocking?: boolean
  },
) {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('lot_id', lotId)
    .order('reported_at', { ascending: false })

  if (filters?.phase_id) query = query.eq('phase_id', filters.phase_id)
  if (filters?.crew_id) query = query.eq('crew_id', filters.crew_id)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.blocking !== undefined) query = query.eq('blocking', filters.blocking)

  const { data, error } = await query
  if (error) throw error
  return data as FrmHouseItem[]
}

/** List items across all lots in a jobsite */
export async function listHouseItemsByJobsite(
  supabase: SupabaseClient,
  jobsiteId: string,
  filters?: { status?: ItemStatus; type?: ItemType; blocking?: boolean },
) {
  // Join through frm_lots to get items for all lots in jobsite
  let query = supabase
    .from(TABLE)
    .select(`
      *,
      lot:frm_lots!inner(id, lot_number, jobsite_id)
    `)
    .eq('lot.jobsite_id', jobsiteId)
    .order('reported_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.blocking !== undefined) query = query.eq('blocking', filters.blocking)

  const { data, error } = await query
  if (error) throw error
  return data as (FrmHouseItem & { lot: { id: string; lot_number: string; jobsite_id: string } })[]
}

/** Get a single house item */
export async function getHouseItem(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FrmHouseItem
}

/** Create a house item with auto-filled crew_id */
export async function createHouseItem(
  supabase: SupabaseClient,
  input: CreateHouseItemInput,
  reportedBy: string,
  crewId?: string | null,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      lot_id: input.lot_id,
      phase_id: input.phase_id ?? null,
      crew_id: crewId ?? null,
      type: input.type,
      severity: input.severity,
      title: input.title,
      description: input.description ?? null,
      photo_url: input.photo_url,
      reported_by: reportedBy,
      status: 'open',
      blocking: input.blocking ?? (input.type === 'safety'),
      gate_check_id: input.gate_check_id ?? null,
      organization_id: input.organization_id ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmHouseItem
}

/** Resolve a house item (requires photo proof) */
export async function resolveHouseItem(
  supabase: SupabaseClient,
  id: string,
  resolvedBy: string,
  input: ResolveHouseItemInput,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'resolved',
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      resolved_photo: input.resolved_photo,
      resolution_note: input.resolution_note ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmHouseItem
}

/** Update item status (e.g. open → in_progress) */
export async function updateHouseItemStatus(
  supabase: SupabaseClient,
  id: string,
  status: ItemStatus,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmHouseItem
}

/** Count blocking items for a lot+phase (used by phase-flow) */
export async function countBlockingItems(
  supabase: SupabaseClient,
  lotId: string,
  phaseId?: PhaseId,
) {
  let query = supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('lot_id', lotId)
    .eq('blocking', true)
    .neq('status', 'resolved')

  if (phaseId) query = query.eq('phase_id', phaseId)

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}
