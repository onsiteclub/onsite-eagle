import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmCrew, FrmCrewWorker } from '../types/crew'

const CREWS_TABLE = 'frm_crews'
const WORKERS_TABLE = 'frm_crew_workers'

export interface CreateCrewInput {
  name: string
  lead_id?: string
  specialty?: string[]
  phone?: string
  email?: string
  wsib_number?: string
  wsib_expires?: string
  organization_id?: string
}

export interface UpdateCrewInput {
  name?: string
  lead_id?: string | null
  specialty?: string[]
  phone?: string | null
  email?: string | null
  wsib_number?: string | null
  wsib_expires?: string | null
  status?: string
}

export interface AddWorkerInput {
  crew_id: string
  worker_id: string
  role?: string
  employment_type?: string
  organization_id?: string
}

/** List all crews */
export async function listCrews(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from(CREWS_TABLE)
    .select(`
      *,
      workers:frm_crew_workers(
        id, worker_id, role, employment_type,
        profile:core_profiles(id, full_name, phone)
      )
    `)
    .eq('status', 'active')
    .order('name')

  if (error) throw error
  return data as Array<FrmCrew & {
    workers: Array<FrmCrewWorker & {
      profile: { id: string; full_name: string | null; phone: string | null } | null
    }>
  }>
}

/** Get a single crew with workers */
export async function getCrew(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(CREWS_TABLE)
    .select(`
      *,
      workers:frm_crew_workers(
        id, worker_id, role, employment_type, joined_at,
        profile:core_profiles(id, full_name, phone, email)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FrmCrew & {
    workers: Array<FrmCrewWorker & {
      profile: { id: string; full_name: string | null; phone: string | null; email: string | null } | null
    }>
  }
}

/** Create a new crew */
export async function createCrew(supabase: SupabaseClient, input: CreateCrewInput) {
  const { data, error } = await supabase
    .from(CREWS_TABLE)
    .insert({
      name: input.name,
      lead_id: input.lead_id ?? null,
      specialty: input.specialty ?? [],
      phone: input.phone ?? null,
      email: input.email ?? null,
      wsib_number: input.wsib_number ?? null,
      wsib_expires: input.wsib_expires ?? null,
      organization_id: input.organization_id ?? null,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmCrew
}

/** Update a crew */
export async function updateCrew(supabase: SupabaseClient, id: string, input: UpdateCrewInput) {
  const { data, error } = await supabase
    .from(CREWS_TABLE)
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmCrew
}

/** Delete a crew (set inactive) */
export async function deactivateCrew(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(CREWS_TABLE)
    .update({ status: 'inactive' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmCrew
}

/** Add a worker to a crew */
export async function addWorkerToCrew(supabase: SupabaseClient, input: AddWorkerInput) {
  const { data, error } = await supabase
    .from(WORKERS_TABLE)
    .insert({
      crew_id: input.crew_id,
      worker_id: input.worker_id,
      role: input.role ?? 'worker',
      employment_type: input.employment_type ?? 'subcontractor',
      organization_id: input.organization_id ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmCrewWorker
}

/** Remove a worker from a crew */
export async function removeWorkerFromCrew(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from(WORKERS_TABLE)
    .update({ left_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}
