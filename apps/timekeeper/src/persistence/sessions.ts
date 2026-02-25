import { getDb } from '../lib/database';
import { generateUUID } from '@onsite/utils/uuid';
import { getUserId } from '@onsite/auth/core';
import type { TrackingEvent, WorkSession } from '@onsite/shared';
import { logger } from '@onsite/logger';

/**
 * Map TrackingSource → SessionSource.
 * SDK/headless/watchdog/gps_check all become 'gps'.
 * Manual and voice pass through.
 */
function toSessionSource(source: TrackingEvent['source']): WorkSession['source'] {
  switch (source) {
    case 'manual': return 'manual';
    case 'voice': return 'voice';
    default: return 'gps';
  }
}

/**
 * Create a new open work_session (exit_at = NULL).
 * Returns the session ID.
 *
 * IDEMPOTENT: If an open session already exists for the same fence,
 * returns the existing session ID (duplicate ENTER = no-op).
 * If an open session exists for a DIFFERENT fence, this is a bug
 * in the engine — we log a warning and return the existing ID
 * rather than creating a corrupt state.
 *
 * Uses BEGIN IMMEDIATE to prevent concurrent headless + foreground races.
 */
export async function createOpenSession(event: TrackingEvent): Promise<string> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId) throw new Error('No authenticated user');

  await db.execAsync('BEGIN IMMEDIATE');
  try {
    // Check for any existing open session
    const existing = await db.getFirstAsync<{ id: string; location_id: string | null }>(
      `SELECT id, location_id FROM work_sessions
       WHERE user_id = ? AND exit_at IS NULL AND deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );

    if (existing) {
      if (existing.location_id === event.fenceId) {
        // Same fence — duplicate ENTER (headless + foreground race, bounce, etc.)
        logger.debug('SESSION', 'Open session already exists for this fence — idempotent', {
          id: existing.id,
          fence: event.fenceId,
        });
        await db.execAsync('COMMIT');
        return existing.id;
      }

      // Different fence — should not happen (engine handles fence-switch via confirmExit first).
      // Defensive: log warning and return existing session to avoid creating duplicates.
      logger.warn('SESSION', 'Open session exists for different fence — returning existing to avoid duplicate', {
        existingId: existing.id,
        existingFence: existing.location_id,
        newFence: event.fenceId,
      });
      await db.execAsync('COMMIT');
      return existing.id;
    }

    // No open session — create new one
    const id = generateUUID();
    const meta = JSON.stringify({
      received_at: event.receivedAt,
      delay_ms: event.delayMs,
    });

    await db.runAsync(
      `INSERT INTO work_sessions (id, user_id, location_id, location_name, enter_at, source, confidence, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, event.fenceId, null, event.occurredAt, toSessionSource(event.source), event.confidence, meta],
    );

    await db.execAsync('COMMIT');
    logger.info('SESSION', 'Open session created', { id, fence: event.fenceId, source: event.source });
    return id;
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

/**
 * Update location_name on an open session (after fence lookup).
 */
export async function setSessionLocationName(sessionId: string, name: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE work_sessions SET location_name = ?, updated_at = datetime('now') WHERE id = ?`,
    [name, sessionId],
  );
}

/**
 * Close an open session with exit time and duration.
 */
export async function closeSession(
  sessionId: string,
  exitAt: string,
  pauseSeconds: number,
  durationMinutes: number,
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE work_sessions SET
      exit_at = ?,
      break_seconds = ?,
      duration_minutes = ?,
      updated_at = datetime('now'),
      synced_at = NULL
    WHERE id = ?`,
    [exitAt, pauseSeconds, durationMinutes, sessionId],
  );

  logger.info('SESSION', 'Session closed', { id: sessionId, duration: durationMinutes });
}

/**
 * Get session by ID.
 */
export async function getSession(sessionId: string): Promise<WorkSession | null> {
  const db = getDb();
  return db.getFirstAsync<WorkSession>(
    `SELECT * FROM work_sessions WHERE id = ? AND deleted_at IS NULL`,
    [sessionId],
  );
}

/**
 * Get all sessions for a given date (YYYY-MM-DD).
 */
export async function getSessionsForDate(userId: string, date: string): Promise<WorkSession[]> {
  const db = getDb();
  return db.getAllAsync<WorkSession>(
    `SELECT * FROM work_sessions
     WHERE user_id = ? AND date(enter_at) = ? AND deleted_at IS NULL
     ORDER BY enter_at ASC`,
    [userId, date],
  );
}

/**
 * Calculate duration in minutes between enter and exit, minus pause.
 */
export function calculateDuration(enterAt: string, exitAt: string, pauseSeconds: number): number {
  const enterMs = new Date(enterAt).getTime();
  const exitMs = new Date(exitAt).getTime();
  const netMs = exitMs - enterMs - (pauseSeconds * 1000);
  return Math.max(0, Math.round(netMs / 60000));
}
