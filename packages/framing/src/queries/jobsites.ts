import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmJobsite } from '../types/jobsite'

const TABLE = 'frm_jobsites'

export interface CreateJobsiteInput {
  name: string
  builder_name: string
  city: string
  address?: string
  start_date?: string
  expected_end_date?: string
  foreman_id?: string
  lumberyard_notes?: string
  organization_id?: string
}

export interface UpdateJobsiteInput {
  name?: string
  builder_name?: string
  city?: string
  address?: string
  start_date?: string
  expected_end_date?: string
  status?: string
  foreman_id?: string | null
  lumberyard_notes?: string | null
  svg_data?: string | null
  original_plan_url?: string | null
}

/** List all jobsites for the user's organizations */
export async function listJobsites(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as FrmJobsite[]
}

/** Get a single jobsite by ID */
export async function getJobsite(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FrmJobsite
}

/** Get a jobsite with lot count stats */
export async function getJobsiteWithStats(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      lots:frm_lots(id, lot_number, status, current_phase)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FrmJobsite & { lots: Array<{ id: string; lot_number: string; status: string; current_phase: string | null }> }
}

/** Create a new jobsite */
export async function createJobsite(supabase: SupabaseClient, input: CreateJobsiteInput) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: input.name,
      builder_name: input.builder_name,
      city: input.city,
      address: input.address ?? null,
      start_date: input.start_date ?? null,
      expected_end_date: input.expected_end_date ?? null,
      foreman_id: input.foreman_id ?? null,
      lumberyard_notes: input.lumberyard_notes ?? null,
      organization_id: input.organization_id ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmJobsite
}

/** Update a jobsite */
export async function updateJobsite(supabase: SupabaseClient, id: string, input: UpdateJobsiteInput) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmJobsite
}

/** Delete a jobsite (cascade deletes lots, assignments, etc.) */
export async function deleteJobsite(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}
