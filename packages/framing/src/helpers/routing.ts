import type { SupabaseClient } from '@supabase/supabase-js'
import type { PhaseId } from '../types/phase'

/**
 * Find the crew assigned to a specific lot+phase.
 * Used to auto-fill crew_id when creating house items.
 */
export async function findCrewForLotPhase(
  supabase: SupabaseClient,
  lotId: string,
  phaseId: PhaseId,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('frm_phase_assignments')
    .select('crew_id')
    .eq('lot_id', lotId)
    .eq('phase_id', phaseId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.crew_id ?? null
}

/**
 * Find all lots assigned to a specific crew.
 * Used to filter what a crew_lead can see.
 */
export async function findLotsForCrew(
  supabase: SupabaseClient,
  crewId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('frm_phase_assignments')
    .select('lot_id')
    .eq('crew_id', crewId)
    .neq('status', 'cancelled')

  if (error) throw error

  // Deduplicate lot_ids
  const lotIds = new Set((data ?? []).map(d => d.lot_id as string))
  return Array.from(lotIds)
}

/**
 * Find all phases assigned to a crew for a given lot.
 * Used to scope house items to a crew's work.
 */
export async function findPhasesForCrewOnLot(
  supabase: SupabaseClient,
  crewId: string,
  lotId: string,
): Promise<PhaseId[]> {
  const { data, error } = await supabase
    .from('frm_phase_assignments')
    .select('phase_id')
    .eq('crew_id', crewId)
    .eq('lot_id', lotId)
    .neq('status', 'cancelled')

  if (error) throw error
  return (data ?? []).map(d => d.phase_id as PhaseId)
}
