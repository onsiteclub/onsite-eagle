/**
 * Pause / Resume — Pause and resume an active tracking session.
 *
 * Strategy: Store pause_start_at in active_tracking meta. On resume,
 * compute elapsed pause time and add to pause_seconds.
 *
 * Spec: 06-USECASES.md "usecases/pauseResume.ts"
 */
import { getDb } from '../lib/database';
import { logger } from '@onsite/logger';
import { getActiveTracking } from '../persistence/activeTracking';
import { enqueue } from '../tracking/effects';

/**
 * Pause the active session. Stores pause start time.
 */
export async function pauseSession(): Promise<void> {
  const state = await getActiveTracking();
  if (state.status !== 'TRACKING') {
    logger.debug('USECASE', 'Pause ignored — not TRACKING', { status: state.status });
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();

  // Store pause_start_at in the exit_at field (repurposed during TRACKING).
  // We use a dedicated approach: store in meta column of work_sessions.
  await db.runAsync(
    `UPDATE work_sessions SET
      meta = json_set(COALESCE(meta, '{}'), '$.pause_start_at', ?),
      updated_at = datetime('now')
    WHERE id = ?`,
    [now, state.session_id],
  );

  await enqueue('UI_REFRESH');

  logger.info('USECASE', 'Session paused', { session: state.session_id });
}

/**
 * Resume the active session. Computes elapsed pause and adds to break_seconds.
 */
export async function resumeSession(): Promise<void> {
  const state = await getActiveTracking();
  if (state.status !== 'TRACKING') {
    logger.debug('USECASE', 'Resume ignored — not TRACKING', { status: state.status });
    return;
  }

  const db = getDb();

  // Read pause_start_at from session meta
  const session = await db.getFirstAsync<{ meta: string | null; break_seconds: number }>(
    `SELECT meta, break_seconds FROM work_sessions WHERE id = ?`,
    [state.session_id],
  );

  if (!session?.meta) return;

  const meta = JSON.parse(session.meta);
  if (!meta.pause_start_at) {
    logger.debug('USECASE', 'Resume ignored — no pause_start_at');
    return;
  }

  // Calculate elapsed pause
  const pauseStart = new Date(meta.pause_start_at).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.max(0, Math.round((now - pauseStart) / 1000));
  const newBreakSeconds = (session.break_seconds || 0) + elapsedSeconds;

  // Update session: add pause time to break_seconds, clear pause_start_at
  await db.runAsync(
    `UPDATE work_sessions SET
      break_seconds = ?,
      meta = json_remove(COALESCE(meta, '{}'), '$.pause_start_at'),
      updated_at = datetime('now'),
      synced_at = NULL
    WHERE id = ?`,
    [newBreakSeconds, state.session_id],
  );

  // Update active_tracking pause_seconds
  await db.runAsync(
    `UPDATE active_tracking SET pause_seconds = ?, updated_at = datetime('now') WHERE id = 'current'`,
    [newBreakSeconds],
  );

  await enqueue('UI_REFRESH');

  logger.info('USECASE', 'Session resumed', {
    session: state.session_id,
    pauseAdded: `${elapsedSeconds}s`,
    totalBreak: `${newBreakSeconds}s`,
  });
}
