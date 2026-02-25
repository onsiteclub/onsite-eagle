/**
 * Delete Session — Soft-delete a work_session (or all sessions for a date).
 *
 * Spec: 06-USECASES.md "usecases/deleteSession.ts"
 */
import { getDb } from '../lib/database';
import { logger } from '@onsite/logger';
import { rebuildDaySummary } from '../persistence/daySummary';
import { getSession } from '../persistence/sessions';
import { enqueue } from '../tracking/effects';

/**
 * Soft-delete a session by ID, or all sessions for a date.
 */
export async function deleteSession(
  userId: string,
  sessionId?: string,
  date?: string,
): Promise<void> {
  const db = getDb();

  if (sessionId) {
    const session = await getSession(sessionId);
    if (!session) throw new Error('Session not found');

    await db.runAsync(
      `UPDATE work_sessions SET deleted_at = datetime('now'), synced_at = NULL WHERE id = ?`,
      [sessionId],
    );

    const sessionDate = session.enter_at.slice(0, 10);
    await rebuildDaySummary(userId, sessionDate);

    logger.info('USECASE', 'Session deleted', { sessionId });
  } else if (date) {
    await db.runAsync(
      `UPDATE work_sessions SET deleted_at = datetime('now'), synced_at = NULL
       WHERE user_id = ? AND date(enter_at) = ? AND deleted_at IS NULL`,
      [userId, date],
    );

    await rebuildDaySummary(userId, date);

    logger.info('USECASE', 'All sessions deleted for date', { date });
  } else {
    throw new Error('Must provide sessionId or date');
  }

  await enqueue('SYNC_NOW');
  await enqueue('UI_REFRESH');
}
