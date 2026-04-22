import { execute, query } from '../client'
import { now } from '../id'
import type { SyncEntityType, SyncOperation, SyncQueueRow } from '../schema'

export interface EnqueueInput {
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperation
  priority?: number
  maxAttempts?: number
}

export async function enqueue(input: EnqueueInput): Promise<void> {
  const existing = await query<{ id: number }>(
    `SELECT id FROM sync_queue
     WHERE entity_type = ? AND entity_id = ? AND operation = ?
     LIMIT 1`,
    [input.entityType, input.entityId, input.operation],
  )

  if (existing.length > 0) {
    await execute(
      `UPDATE sync_queue
       SET attempts = 0, last_error = NULL, last_attempt_at = NULL, priority = ?
       WHERE id = ?`,
      [input.priority ?? 0, existing[0].id],
    )
    return
  }

  await execute(
    `INSERT INTO sync_queue (
       entity_type, entity_id, operation, priority, max_attempts, created_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.entityType,
      input.entityId,
      input.operation,
      input.priority ?? 0,
      input.maxAttempts ?? 5,
      now(),
    ],
  )
}

export async function peekNextBatch(limit = 10): Promise<SyncQueueRow[]> {
  return query<SyncQueueRow>(
    `SELECT * FROM sync_queue
     WHERE attempts < max_attempts
     ORDER BY priority DESC, id ASC
     LIMIT ?`,
    [limit],
  )
}

export async function markSucceeded(id: number): Promise<void> {
  await execute(`DELETE FROM sync_queue WHERE id = ?`, [id])
}

export async function markFailed(id: number, error: string): Promise<void> {
  await execute(
    `UPDATE sync_queue
     SET attempts = attempts + 1, last_error = ?, last_attempt_at = ?
     WHERE id = ?`,
    [error, now(), id],
  )
}

export async function pendingCount(): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM sync_queue WHERE attempts < max_attempts`,
  )
  return row?.total ?? 0
}
