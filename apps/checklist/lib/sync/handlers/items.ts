import { createClient } from '@onsite/supabase/client'
import { query } from '@/lib/db/client'
import type { GateCheckItemRow, GateCheckRow } from '@/lib/db/schema'
import {
  findItem,
  markItemSyncStatus,
  markItemSynced,
} from '@/lib/db/repositories/gate-checks'

/**
 * Push a local item change (result / notes / photo_url) to the server.
 *
 * Preconditions:
 *  - The owning gate_check has been synced (has remote_id). If not, we
 *    throw so the queue retries after the gate_check sync runs.
 *  - The item has a remote_id assigned by the gate_check handler.
 */
export async function syncItem(itemId: string): Promise<void> {
  const item = await findItem(itemId)
  if (!item) {
    throw new Error(`Item ${itemId} not found locally`)
  }

  const [gc] = await query<GateCheckRow>(
    `SELECT * FROM gate_checks WHERE id = ? LIMIT 1`,
    [item.gate_check_id],
  )
  if (!gc) {
    throw new Error(`Parent gate check ${item.gate_check_id} not found`)
  }

  if (!gc.remote_id) {
    throw new Error('Gate check not yet synced — retry later')
  }

  if (!item.remote_id) {
    throw new Error('Item has no remote id — wait for gate check handler')
  }

  await markItemSyncStatus(itemId, 'syncing')

  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('frm_gate_check_items')
      .update({
        result: item.result,
        notes: item.notes,
        photo_url: item.photo_url,
      })
      .eq('id', item.remote_id)

    if (error) throw new Error(error.message)

    await markItemSynced(itemId, item.remote_id)
  } catch (err) {
    await markItemSyncStatus(itemId, 'error')
    throw err
  }
}

/** Re-export type for convenience in the engine. */
export type { GateCheckItemRow }
