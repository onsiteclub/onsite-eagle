import { getDb } from '../lib/database';
import type { ActiveTracking, TrackingStatus, TrackingEvent } from '@onsite/shared';

/**
 * Read the active_tracking singleton row.
 * Always returns a row (initialized by migration).
 */
export async function getActiveTracking(): Promise<ActiveTracking> {
  const db = getDb();
  const row = await db.getFirstAsync<ActiveTracking>(
    `SELECT * FROM active_tracking WHERE id = 'current'`
  );
  if (!row) throw new Error('active_tracking singleton missing');
  return row;
}

/**
 * Set active_tracking to a new state.
 */
export async function setActiveTracking(
  status: TrackingStatus,
  sessionId: string | null,
  event: TrackingEvent | null,
  overrides?: Partial<Pick<ActiveTracking, 'exit_at' | 'cooldown_expires_at'>>,
): Promise<void> {
  const db = getDb();
  // When event is null (state transitions like EXIT_PENDING→TRACKING),
  // COALESCE preserves existing location_id and enter_at.
  await db.runAsync(
    `UPDATE active_tracking SET
      status = ?,
      session_id = ?,
      location_id = COALESCE(?, location_id),
      enter_at = COALESCE(?, enter_at),
      exit_at = ?,
      cooldown_expires_at = ?,
      updated_at = datetime('now')
    WHERE id = 'current'`,
    [
      status,
      sessionId,
      event?.fenceId ?? null,
      event?.type === 'enter' ? event.occurredAt : null,
      overrides?.exit_at ?? null,
      overrides?.cooldown_expires_at ?? null,
    ],
  );
}

/**
 * Update only the location_name field (after fence lookup).
 */
export async function setActiveTrackingLocationName(name: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE active_tracking SET location_name = ?, updated_at = datetime('now') WHERE id = 'current'`,
    [name],
  );
}

/**
 * Update cooldown_expires_at during EXIT_PENDING.
 */
export async function updateCooldown(expiresAt: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE active_tracking SET cooldown_expires_at = ?, updated_at = datetime('now') WHERE id = 'current'`,
    [expiresAt],
  );
}

/**
 * Clear active_tracking back to IDLE.
 */
export async function clearActiveTracking(): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE active_tracking SET
      status = 'IDLE',
      session_id = NULL,
      location_id = NULL,
      location_name = NULL,
      enter_at = NULL,
      exit_at = NULL,
      cooldown_expires_at = NULL,
      pause_seconds = 0,
      updated_at = datetime('now')
    WHERE id = 'current'`,
  );
}
