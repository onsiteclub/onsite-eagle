import { execute, query } from '../client'
import { now, uuid } from '../id'
import type { PhotoRow, SyncStatus } from '../schema'
import { enqueue } from './sync-queue'

export interface NewPhotoInput {
  itemId: string
  gateCheckId: string
  localPath: string
}

export async function createPhoto(input: NewPhotoInput): Promise<PhotoRow> {
  const id = uuid()
  const ts = now()

  await execute(
    `INSERT INTO photos (
       id, item_id, gate_check_id, local_path, sync_status, created_at
     ) VALUES (?, ?, ?, ?, 'pending', ?)`,
    [id, input.itemId, input.gateCheckId, input.localPath, ts],
  )

  await enqueue({
    entityType: 'photo',
    entityId: id,
    operation: 'create',
    priority: 3, // highest — items depend on photo remote_url
  })

  return {
    id,
    item_id: input.itemId,
    gate_check_id: input.gateCheckId,
    local_path: input.localPath,
    remote_url: null,
    sync_status: 'pending',
    created_at: ts,
  }
}

export async function findPhotosForItem(itemId: string): Promise<PhotoRow[]> {
  return query<PhotoRow>(
    `SELECT * FROM photos WHERE item_id = ? ORDER BY created_at ASC`,
    [itemId],
  )
}

export async function listPendingPhotos(limit = 5): Promise<PhotoRow[]> {
  return query<PhotoRow>(
    `SELECT * FROM photos
     WHERE sync_status IN ('pending', 'error')
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit],
  )
}

export async function markPhotoSynced(id: string, remoteUrl: string): Promise<void> {
  await execute(
    `UPDATE photos SET remote_url = ?, sync_status = 'synced' WHERE id = ?`,
    [remoteUrl, id],
  )
}

export async function markPhotoSyncStatus(id: string, status: SyncStatus): Promise<void> {
  await execute(
    `UPDATE photos SET sync_status = ? WHERE id = ?`,
    [status, id],
  )
}

export async function deletePhoto(id: string): Promise<void> {
  await execute(`DELETE FROM photos WHERE id = ?`, [id])
}

export async function findPhoto(id: string): Promise<PhotoRow | null> {
  const [row] = await query<PhotoRow>(
    `SELECT * FROM photos WHERE id = ? LIMIT 1`,
    [id],
  )
  return row ?? null
}
