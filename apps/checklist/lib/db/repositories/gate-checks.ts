import { execute, query } from '../client'
import { now, uuid } from '../id'
import type {
  GateCheckItemRow,
  GateCheckResult,
  GateCheckRow,
  GateCheckStatus,
  SyncStatus,
} from '../schema'
import { enqueue } from './sync-queue'

export interface NewGateCheckInput {
  lotId: string
  lotNumber?: string | null
  lotAddress?: string | null
  jobsiteName?: string | null
  organizationId?: string | null
  transition: string
  checkedBy: string
  items: Array<{
    itemCode: string
    itemLabel: string
    isBlocking: boolean
  }>
}

export interface GateCheckWithItems {
  gateCheck: GateCheckRow
  items: GateCheckItemRow[]
}

export async function createGateCheck(input: NewGateCheckInput): Promise<GateCheckWithItems> {
  const gateCheckId = uuid()
  const ts = now()

  await execute(
    `INSERT INTO gate_checks (
       id, lot_id, lot_number, lot_address, jobsite_name, organization_id,
       transition, checked_by, status, sync_status,
       started_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', 'pending', ?, ?, ?)`,
    [
      gateCheckId,
      input.lotId,
      input.lotNumber ?? null,
      input.lotAddress ?? null,
      input.jobsiteName ?? null,
      input.organizationId ?? null,
      input.transition,
      input.checkedBy,
      ts,
      ts,
      ts,
    ],
  )

  const items: GateCheckItemRow[] = []
  for (const item of input.items) {
    const itemId = uuid()
    await execute(
      `INSERT INTO gate_check_items (
         id, gate_check_id, item_code, item_label, is_blocking,
         result, sync_status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'pending', 'pending', ?, ?)`,
      [
        itemId,
        gateCheckId,
        item.itemCode,
        item.itemLabel,
        item.isBlocking ? 1 : 0,
        ts,
        ts,
      ],
    )

    items.push({
      id: itemId,
      remote_id: null,
      gate_check_id: gateCheckId,
      item_code: item.itemCode,
      item_label: item.itemLabel,
      is_blocking: item.isBlocking ? 1 : 0,
      result: 'pending',
      notes: null,
      photo_url: null,
      sync_status: 'pending',
      created_at: ts,
      updated_at: ts,
    })
  }

  await enqueue({
    entityType: 'gate_check',
    entityId: gateCheckId,
    operation: 'create',
    priority: 2,
  })

  const gateCheck: GateCheckRow = {
    id: gateCheckId,
    remote_id: null,
    lot_id: input.lotId,
    lot_number: input.lotNumber ?? null,
    lot_address: input.lotAddress ?? null,
    jobsite_name: input.jobsiteName ?? null,
    organization_id: input.organizationId ?? null,
    transition: input.transition,
    checked_by: input.checkedBy,
    status: 'in_progress',
    sync_status: 'pending',
    started_at: ts,
    completed_at: null,
    released_at: null,
    created_at: ts,
    updated_at: ts,
  }

  return { gateCheck, items }
}

export async function findGateCheck(id: string): Promise<GateCheckWithItems | null> {
  const [gc] = await query<GateCheckRow>(
    `SELECT * FROM gate_checks WHERE id = ? LIMIT 1`,
    [id],
  )
  if (!gc) return null

  const items = await query<GateCheckItemRow>(
    `SELECT * FROM gate_check_items WHERE gate_check_id = ? ORDER BY created_at ASC`,
    [id],
  )

  return { gateCheck: gc, items }
}

export async function findLatestGateCheckForLot(
  lotId: string,
  transition: string,
): Promise<GateCheckWithItems | null> {
  const [gc] = await query<GateCheckRow>(
    `SELECT * FROM gate_checks
     WHERE lot_id = ? AND transition = ?
     ORDER BY started_at DESC
     LIMIT 1`,
    [lotId, transition],
  )
  if (!gc) return null

  const items = await query<GateCheckItemRow>(
    `SELECT * FROM gate_check_items WHERE gate_check_id = ? ORDER BY created_at ASC`,
    [gc.id],
  )

  return { gateCheck: gc, items }
}

export async function updateItemResult(
  itemId: string,
  patch: {
    result?: GateCheckResult
    notes?: string | null
    photoUrl?: string | null
  },
): Promise<void> {
  const ts = now()
  const sets: string[] = [`sync_status = 'pending'`, `updated_at = ?`]
  const params: unknown[] = [ts]

  if (patch.result !== undefined) {
    sets.push('result = ?')
    params.push(patch.result)
  }
  if (patch.notes !== undefined) {
    sets.push('notes = ?')
    params.push(patch.notes)
  }
  if (patch.photoUrl !== undefined) {
    sets.push('photo_url = ?')
    params.push(patch.photoUrl)
  }

  params.push(itemId)

  await execute(
    `UPDATE gate_check_items SET ${sets.join(', ')} WHERE id = ?`,
    params,
  )

  await enqueue({
    entityType: 'gate_check_item',
    entityId: itemId,
    operation: 'update',
    priority: 1,
  })
}

export async function markGateCheckComplete(
  id: string,
  status: Exclude<GateCheckStatus, 'in_progress'>,
): Promise<void> {
  const ts = now()
  await execute(
    `UPDATE gate_checks SET status = ?, sync_status = 'pending', completed_at = ?, updated_at = ? WHERE id = ?`,
    [status, ts, ts, id],
  )

  await enqueue({
    entityType: 'completion',
    entityId: id,
    operation: 'update',
    priority: 0,
  })
}

export async function markGateCheckSynced(id: string, remoteId: string): Promise<void> {
  await execute(
    `UPDATE gate_checks SET remote_id = ?, sync_status = 'synced' WHERE id = ?`,
    [remoteId, id],
  )
}

export async function markItemSynced(id: string, remoteId: string): Promise<void> {
  await execute(
    `UPDATE gate_check_items SET remote_id = ?, sync_status = 'synced' WHERE id = ?`,
    [remoteId, id],
  )
}

export async function markItemSyncStatus(id: string, status: SyncStatus): Promise<void> {
  await execute(
    `UPDATE gate_check_items SET sync_status = ? WHERE id = ?`,
    [status, id],
  )
}

export async function findItem(id: string): Promise<GateCheckItemRow | null> {
  const [row] = await query<GateCheckItemRow>(
    `SELECT * FROM gate_check_items WHERE id = ? LIMIT 1`,
    [id],
  )
  return row ?? null
}

export async function listItemsForGateCheck(gateCheckId: string): Promise<GateCheckItemRow[]> {
  return query<GateCheckItemRow>(
    `SELECT * FROM gate_check_items WHERE gate_check_id = ? ORDER BY created_at ASC`,
    [gateCheckId],
  )
}

export async function listPendingGateChecks(limit = 10): Promise<GateCheckRow[]> {
  return query<GateCheckRow>(
    `SELECT * FROM gate_checks
     WHERE sync_status IN ('pending', 'error')
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit],
  )
}

export async function listPendingItems(limit = 20): Promise<GateCheckItemRow[]> {
  return query<GateCheckItemRow>(
    `SELECT * FROM gate_check_items
     WHERE sync_status IN ('pending', 'error')
     ORDER BY updated_at ASC
     LIMIT ?`,
    [limit],
  )
}
