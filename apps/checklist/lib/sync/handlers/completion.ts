import { createClient } from '@onsite/supabase/client'
import { completeGateCheck } from '@onsite/framing'
import { query } from '@/lib/db/client'
import type { GateCheckItemRow, GateCheckRow } from '@/lib/db/schema'

/**
 * Trigger server-side completeGateCheck() once all items have their
 * final results uploaded. This is what actually advances the lot's
 * phase and creates deficiency items for failed checks.
 *
 * Throws if prerequisites aren't met, so the queue will retry on the
 * next tick.
 */
export async function syncCompletion(gateCheckLocalId: string): Promise<void> {
  const [gc] = await query<GateCheckRow>(
    `SELECT * FROM gate_checks WHERE id = ? LIMIT 1`,
    [gateCheckLocalId],
  )
  if (!gc) {
    throw new Error(`Gate check ${gateCheckLocalId} not found locally`)
  }

  if (!gc.remote_id) {
    throw new Error('Gate check not yet synced — retry later')
  }

  // Wait for all items to be synced before completing.
  const unsyncedItems = await query<GateCheckItemRow>(
    `SELECT id FROM gate_check_items
     WHERE gate_check_id = ? AND sync_status != 'synced'`,
    [gateCheckLocalId],
  )
  if (unsyncedItems.length > 0) {
    throw new Error(`${unsyncedItems.length} items still pending — retry later`)
  }

  const supabase = createClient()
  await completeGateCheck(supabase, gc.remote_id)
}
