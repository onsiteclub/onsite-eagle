/**
 * Edit Session — Modify a work_session's times, break, or notes.
 *
 * Used by: Voice ("I left at 4pm"), Manual UI (edit modal), Secretary AI (cleanup).
 * All three call this SAME function. No parallel systems.
 *
 * Spec: 06-USECASES.md "usecases/editSession.ts"
 */
import { getDb } from '../lib/database';
import { logger } from '@onsite/logger';
import { SOURCE_PRIORITY } from '@onsite/shared';
import type { WorkSession } from '@onsite/shared';
import { getSession, getSessionsForDate, calculateDuration } from '../persistence/sessions';
import { rebuildDaySummary } from '../persistence/daySummary';
import { enqueue } from '../tracking/effects';

export interface EditSessionInput {
  sessionId?: string;
  date?: string;
  userId: string;
  changes: {
    enter_at?: string;
    exit_at?: string;
    break_seconds?: number;
    notes?: string;
    type?: string;
  };
  source: 'voice' | 'manual' | 'secretary';
  reason?: string;
}

/**
 * Edit a work session. Respects source priority — secretary cannot overwrite voice/manual.
 */
export async function editSession(input: EditSessionInput): Promise<void> {
  const db = getDb();

  // 1. Find session
  let session: WorkSession | null = null;
  if (input.sessionId) {
    session = await getSession(input.sessionId);
  } else if (input.date) {
    const sessions = await getSessionsForDate(input.userId, input.date);
    if (sessions.length === 1) {
      session = sessions[0];
    }
  }

  if (!session) throw new Error('Session not found');

  // 2. Check source priority — secretary cannot overwrite voice or manual
  const currentPriority = SOURCE_PRIORITY[session.source] || 0;
  const newPriority = SOURCE_PRIORITY[input.source] || 0;
  if (newPriority < currentPriority && input.source === 'secretary') {
    logger.debug('USECASE', 'Secretary skipped — higher priority source exists', {
      session: session.id,
      currentSource: session.source,
    });
    return;
  }

  // 3. If AI correction, log originals for undo
  if (input.source === 'secretary' && input.reason) {
    const date = input.date || session.enter_at.slice(0, 10);
    for (const [field, value] of Object.entries(input.changes)) {
      await db.runAsync(
        `INSERT INTO ai_corrections (user_id, session_id, date, field, original_value, corrected_value, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.userId,
          session.id,
          date,
          field,
          String((session as Record<string, unknown>)[field] ?? ''),
          String(value),
          input.reason,
        ],
      );
    }
  }

  // 4. Build update
  const enterAt = input.changes.enter_at || session.enter_at;
  const exitAt = input.changes.exit_at || session.exit_at;
  const breakSeconds = input.changes.break_seconds ?? session.break_seconds;

  let durationMinutes = session.duration_minutes;
  if ((input.changes.enter_at || input.changes.exit_at || input.changes.break_seconds !== undefined) && exitAt) {
    durationMinutes = calculateDuration(enterAt, exitAt, breakSeconds);
  }

  // 5. Apply changes
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (input.changes.enter_at) { setClauses.push('enter_at = ?'); params.push(input.changes.enter_at); }
  if (input.changes.exit_at) { setClauses.push('exit_at = ?'); params.push(input.changes.exit_at); }
  if (input.changes.break_seconds !== undefined) { setClauses.push('break_seconds = ?'); params.push(input.changes.break_seconds); }
  if (input.changes.notes !== undefined) { setClauses.push('notes = ?'); params.push(input.changes.notes); }
  if (durationMinutes !== session.duration_minutes) { setClauses.push('duration_minutes = ?'); params.push(durationMinutes); }

  setClauses.push('source = ?'); params.push(input.source === 'secretary' ? 'secretary' : input.source);
  setClauses.push("updated_at = datetime('now')");
  setClauses.push('synced_at = NULL');
  params.push(session.id);

  await db.runAsync(
    `UPDATE work_sessions SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
  );

  // 6. Rebuild day_summary
  const date = input.date || session.enter_at.slice(0, 10);
  await rebuildDaySummary(input.userId, date);

  // 7. Effects
  await enqueue('SYNC_NOW');
  await enqueue('UI_REFRESH');

  logger.info('USECASE', 'Session edited', {
    session: session.id,
    source: input.source,
    fields: Object.keys(input.changes),
  });
}
