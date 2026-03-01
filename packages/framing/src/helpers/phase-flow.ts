import type { SupabaseClient } from '@supabase/supabase-js'
import type { PhaseId } from '../types/phase'
import type { GateCheckTransition } from '../types/gate-check'
import { countBlockingItems } from '../queries/house-items'

/**
 * Map a phase progression to the gate check transition that must pass
 * before the lot can advance beyond that phase group.
 *
 * Framing phases:     capping → floor_1 → walls_1 → floor_2 → walls_2 → [gate: framing_to_roofing]
 * Roofing phase:      roof → [gate: roofing_to_trades]
 * Trades pause:       (external) → [gate: trades_to_backframe]
 * Backframe phases:   backframe_basement → backframe_strapping → backframe_backing → [gate: backframe_to_final]
 */
export function getRequiredTransition(phaseId: PhaseId): GateCheckTransition | null {
  switch (phaseId) {
    // Last main framing phase — must pass framing_to_roofing
    case 'walls_2':
      return 'framing_to_roofing'
    // Roof complete — must pass roofing_to_trades
    case 'roof':
      return 'roofing_to_trades'
    // Trades done (checked before backframe starts)
    // Note: this gate is typically checked when transitioning INTO backframe_basement
    case 'backframe_basement':
      return 'trades_to_backframe'
    // Last backframe phase — must pass backframe_to_final
    case 'backframe_backing':
      return 'backframe_to_final'
    default:
      return null
  }
}

/** Check if a lot+phase can advance (no blocking items, gate check passed if required) */
export async function canAdvancePhase(
  supabase: SupabaseClient,
  lotId: string,
  currentPhaseId: PhaseId,
): Promise<{ canAdvance: boolean; blockers: string[] }> {
  const blockers: string[] = []

  // 1. Check for unresolved blocking house items
  const blockingCount = await countBlockingItems(supabase, lotId, currentPhaseId)
  if (blockingCount > 0) {
    blockers.push(`${blockingCount} blocking item(s) unresolved on phase ${currentPhaseId}`)
  }

  // 2. Check if a gate check is required and passed
  const requiredTransition = getRequiredTransition(currentPhaseId)
  if (requiredTransition) {
    const { data: latestGc, error } = await supabase
      .from('frm_gate_checks')
      .select('status')
      .eq('lot_id', lotId)
      .eq('transition', requiredTransition)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (!latestGc || latestGc.status !== 'passed') {
      blockers.push(`Gate check "${requiredTransition}" not passed`)
    }
  }

  return {
    canAdvance: blockers.length === 0,
    blockers,
  }
}

/** Get phase flow status for all phases of a lot */
export async function getLotPhaseFlowStatus(
  supabase: SupabaseClient,
  lotId: string,
) {
  // Get all gate checks for this lot
  const { data: gateChecks, error: gcError } = await supabase
    .from('frm_gate_checks')
    .select('transition, status, completed_at')
    .eq('lot_id', lotId)
    .order('started_at', { ascending: false })

  if (gcError) throw gcError

  // Get blocking items count per phase
  const { data: blockingItems, error: biError } = await supabase
    .from('frm_house_items')
    .select('phase_id')
    .eq('lot_id', lotId)
    .eq('blocking', true)
    .neq('status', 'resolved')

  if (biError) throw biError

  // Build a map of blocking counts per phase
  const blockingByPhase: Record<string, number> = {}
  for (const item of blockingItems ?? []) {
    const phase = (item.phase_id as string) ?? 'unassigned'
    blockingByPhase[phase] = (blockingByPhase[phase] ?? 0) + 1
  }

  // Build a map of latest gate check status per transition
  const gateCheckStatus: Record<string, string> = {}
  for (const gc of gateChecks ?? []) {
    const transition = gc.transition as string
    if (!gateCheckStatus[transition]) {
      gateCheckStatus[transition] = gc.status as string
    }
  }

  return { blockingByPhase, gateCheckStatus }
}
