import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmLot, LotStatus } from '../types/lot'
import type { PhaseId } from '../types/phase'

const TABLE = 'frm_lots'

export interface CreateLotInput {
  jobsite_id: string
  lot_number: string
  block?: string
  model?: string
  address?: string
  total_sqft?: number
  sqft_main_floors?: number
  sqft_roof?: number
  sqft_basement?: number
  has_capping?: boolean
  buyer_name?: string
  buyer_contact?: string
  is_sold?: boolean
  target_date?: string
  closing_date?: string
  organization_id?: string
}

export interface UpdateLotInput {
  lot_number?: string
  block?: string | null
  model?: string | null
  address?: string | null
  total_sqft?: number | null
  sqft_main_floors?: number | null
  sqft_roof?: number | null
  sqft_basement?: number | null
  status?: LotStatus
  current_phase?: PhaseId | null
  has_capping?: boolean
  blueprint_url?: string | null
  priority_score?: number | null
  target_date?: string | null
  closing_date?: string | null
  buyer_name?: string | null
  buyer_contact?: string | null
  is_sold?: boolean
  notes?: string | null
}

/** List lots for a jobsite */
export async function listLots(supabase: SupabaseClient, jobsiteId: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('jobsite_id', jobsiteId)
    .order('lot_number', { ascending: true })

  if (error) throw error
  return data as FrmLot[]
}

/** Get a single lot with assignments */
export async function getLot(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      assignments:frm_phase_assignments(
        id, phase_id, crew_id, status,
        crew:frm_crews(id, name)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FrmLot & {
    assignments: Array<{
      id: string
      phase_id: PhaseId
      crew_id: string
      status: string
      crew: { id: string; name: string } | null
    }>
  }
}

/** Create a single lot */
export async function createLot(supabase: SupabaseClient, input: CreateLotInput) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      jobsite_id: input.jobsite_id,
      lot_number: input.lot_number,
      block: input.block ?? null,
      model: input.model ?? null,
      address: input.address ?? null,
      total_sqft: input.total_sqft ?? null,
      sqft_main_floors: input.sqft_main_floors ?? null,
      sqft_roof: input.sqft_roof ?? null,
      sqft_basement: input.sqft_basement ?? null,
      has_capping: input.has_capping ?? false,
      buyer_name: input.buyer_name ?? null,
      buyer_contact: input.buyer_contact ?? null,
      is_sold: input.is_sold ?? false,
      target_date: input.target_date ?? null,
      closing_date: input.closing_date ?? null,
      organization_id: input.organization_id ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data as FrmLot
}

/** Batch create lots (e.g., "Lot 1 through 65") */
export async function batchCreateLots(
  supabase: SupabaseClient,
  jobsiteId: string,
  lots: Array<Pick<CreateLotInput, 'lot_number' | 'block' | 'model' | 'address' | 'total_sqft'>>,
  organizationId?: string,
) {
  const rows = lots.map(lot => ({
    jobsite_id: jobsiteId,
    lot_number: lot.lot_number,
    block: lot.block ?? null,
    model: lot.model ?? null,
    address: lot.address ?? null,
    total_sqft: lot.total_sqft ?? null,
    organization_id: organizationId ?? null,
    status: 'pending' as const,
  }))

  const { data, error } = await supabase
    .from(TABLE)
    .insert(rows)
    .select()

  if (error) throw error
  return data as FrmLot[]
}

/** Update a lot */
export async function updateLot(supabase: SupabaseClient, id: string, input: UpdateLotInput) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmLot
}

/** Update lot status with timestamp tracking */
export async function updateLotStatus(supabase: SupabaseClient, id: string, status: LotStatus) {
  const timestamps: Record<string, string | null> = {}

  if (status === 'released') timestamps.released_at = new Date().toISOString()
  if (status === 'in_progress') timestamps.started_at = new Date().toISOString()
  if (status === 'completed') timestamps.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, ...timestamps })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmLot
}

/** Delete a lot */
export async function deleteLot(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}
