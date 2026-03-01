import type { SupabaseClient } from '@supabase/supabase-js'
import type { FrmGateCheck, FrmGateCheckItem, FrmGateCheckTemplate, GateCheckTransition, GateCheckResult } from '../types/gate-check'

const CHECKS_TABLE = 'frm_gate_checks'
const ITEMS_TABLE = 'frm_gate_check_items'
const TEMPLATES_TABLE = 'frm_gate_check_templates'

/** Get template items for a transition */
export async function getTemplateItems(
  supabase: SupabaseClient,
  transition: GateCheckTransition,
) {
  const { data, error } = await supabase
    .from(TEMPLATES_TABLE)
    .select('*')
    .eq('transition', transition)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as FrmGateCheckTemplate[]
}

/** Start a gate check: creates the gate_check + items from template */
export async function startGateCheck(
  supabase: SupabaseClient,
  lotId: string,
  transition: GateCheckTransition,
  checkedBy: string,
  organizationId?: string,
) {
  // 1. Load template
  const templates = await getTemplateItems(supabase, transition)
  if (templates.length === 0) throw new Error(`No template found for transition: ${transition}`)

  // 2. Create gate check record
  const { data: gateCheck, error: gcError } = await supabase
    .from(CHECKS_TABLE)
    .insert({
      lot_id: lotId,
      transition,
      checked_by: checkedBy,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      organization_id: organizationId ?? null,
    })
    .select()
    .single()

  if (gcError) throw gcError

  // 3. Create items from template
  const items = templates.map(t => ({
    gate_check_id: (gateCheck as FrmGateCheck).id,
    item_code: t.item_code,
    item_label: t.item_label,
    result: 'pending' as const,
  }))

  const { data: checkItems, error: itemsError } = await supabase
    .from(ITEMS_TABLE)
    .insert(items)
    .select()

  if (itemsError) throw itemsError

  return {
    gateCheck: gateCheck as FrmGateCheck,
    items: checkItems as FrmGateCheckItem[],
  }
}

/** Get a gate check with all its items */
export async function getGateCheck(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from(CHECKS_TABLE)
    .select(`
      *,
      items:frm_gate_check_items(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FrmGateCheck & { items: FrmGateCheckItem[] }
}

/** Get the latest gate check for a lot+transition */
export async function getLatestGateCheck(
  supabase: SupabaseClient,
  lotId: string,
  transition: GateCheckTransition,
) {
  const { data, error } = await supabase
    .from(CHECKS_TABLE)
    .select(`
      *,
      items:frm_gate_check_items(*)
    `)
    .eq('lot_id', lotId)
    .eq('transition', transition)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as (FrmGateCheck & { items: FrmGateCheckItem[] }) | null
}

/** List all gate checks for a lot */
export async function listGateChecksByLot(supabase: SupabaseClient, lotId: string) {
  const { data, error } = await supabase
    .from(CHECKS_TABLE)
    .select('*')
    .eq('lot_id', lotId)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data as FrmGateCheck[]
}

/** Update a gate check item result */
export async function updateGateCheckItem(
  supabase: SupabaseClient,
  itemId: string,
  result: GateCheckResult,
  photoUrl?: string,
  notes?: string,
) {
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .update({
      result,
      photo_url: photoUrl ?? null,
      notes: notes ?? null,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data as FrmGateCheckItem
}

/** Link a deficiency (house item) to a gate check item */
export async function linkDeficiency(
  supabase: SupabaseClient,
  itemId: string,
  deficiencyId: string,
) {
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .update({ deficiency_id: deficiencyId })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data as FrmGateCheckItem
}

/** Complete a gate check — computes pass/fail from items */
export async function completeGateCheck(supabase: SupabaseClient, id: string) {
  // 1. Get the gate check with items + template blocking info
  const gc = await getGateCheck(supabase, id)

  // 2. Check if any blocking items failed
  const templates = await getTemplateItems(supabase, gc.transition as GateCheckTransition)
  const blockingCodes = new Set(templates.filter(t => t.is_blocking).map(t => t.item_code))

  const hasBlockingFail = gc.items.some(
    item => item.result === 'fail' && blockingCodes.has(item.item_code),
  )

  // Also fail if any items are still pending
  const hasPending = gc.items.some(item => item.result === 'pending')
  if (hasPending) throw new Error('Cannot complete gate check: some items are still pending')

  const finalStatus = hasBlockingFail ? 'failed' : 'passed'
  const now = new Date().toISOString()

  const updateData: Record<string, unknown> = {
    status: finalStatus,
    completed_at: now,
  }

  // If passed, also set released_at
  if (finalStatus === 'passed') {
    updateData.released_at = now
  }

  const { data, error } = await supabase
    .from(CHECKS_TABLE)
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FrmGateCheck
}
