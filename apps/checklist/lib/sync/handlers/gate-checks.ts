import { createClient } from '@onsite/supabase/client'
import { execute, query } from '@/lib/db/client'
import type { GateCheckItemRow, GateCheckRow } from '@/lib/db/schema'
import { markGateCheckSynced } from '@/lib/db/repositories/gate-checks'

/**
 * Push a newly-created gate check to the server.
 *
 * Inserts rows into `frm_gate_checks` + `frm_gate_check_items` so the
 * server sees the same structure the user sees locally. Subsequent item
 * updates (result / photo_url) are pushed by the item handler using the
 * remote ids saved here.
 */
export async function syncGateCheck(localId: string): Promise<void> {
  const [gc] = await query<GateCheckRow>(
    `SELECT * FROM gate_checks WHERE id = ? LIMIT 1`,
    [localId],
  )
  if (!gc) {
    throw new Error(`Gate check ${localId} not found locally`)
  }

  if (gc.remote_id) {
    return // already synced
  }

  const supabase = createClient()

  const { data: inserted, error: insertErr } = await supabase
    .from('frm_gate_checks')
    .insert({
      lot_id: gc.lot_id,
      organization_id: gc.organization_id,
      transition: gc.transition,
      checked_by: gc.checked_by,
      status: 'in_progress',
      started_at: new Date(gc.started_at).toISOString(),
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message ?? 'Failed to insert gate check')
  }

  const remoteId = inserted.id

  const items = await query<GateCheckItemRow>(
    `SELECT * FROM gate_check_items WHERE gate_check_id = ? ORDER BY created_at ASC`,
    [localId],
  )

  if (items.length > 0) {
    const payload = items.map((item) => ({
      gate_check_id: remoteId,
      item_code: item.item_code,
      item_label: item.item_label,
      result: item.result,
      notes: item.notes,
      photo_url: item.photo_url,
    }))

    const { data: remoteItems, error: itemsErr } = await supabase
      .from('frm_gate_check_items')
      .insert(payload)
      .select('id, item_code')

    if (itemsErr) {
      throw new Error(`Items insert failed: ${itemsErr.message}`)
    }

    // Map remote ids back onto local items by item_code (unique per gate check).
    const remoteByCode = new Map(
      (remoteItems ?? []).map((r) => [r.item_code, r.id]),
    )
    for (const item of items) {
      const remote = remoteByCode.get(item.item_code)
      if (!remote) continue
      await execute(
        `UPDATE gate_check_items SET remote_id = ?, sync_status = 'synced' WHERE id = ?`,
        [remote, item.id],
      )
    }
  }

  await markGateCheckSynced(localId, remoteId)
}
