/**
 * Mark Absence — Set a day as rain/snow/sick/dayoff/holiday with zero hours.
 *
 * If sessions exist for the date, they are soft-deleted (worker is correcting).
 *
 * Spec: 06-USECASES.md "usecases/markAbsence.ts"
 */
import { getDb } from '../lib/database';
import { generateUUID } from '@onsite/utils/uuid';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';
import type { DayType } from '@onsite/shared';
import { enqueue } from '../tracking/effects';

export type AbsenceType = Exclude<DayType, 'work'>;

/**
 * Mark a date as absent. Deletes existing sessions if any.
 */
export async function markAbsence(
  date: string,
  type: AbsenceType,
  notes?: string,
): Promise<void> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId) throw new Error('No authenticated user');

  // Delete existing sessions for this date (worker is correcting)
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM work_sessions WHERE user_id = ? AND date(enter_at) = ? AND deleted_at IS NULL`,
    [userId, date],
  );

  if (existing) {
    await db.runAsync(
      `UPDATE work_sessions SET deleted_at = datetime('now'), synced_at = NULL
       WHERE user_id = ? AND date(enter_at) = ? AND deleted_at IS NULL`,
      [userId, date],
    );
  }

  // Upsert day_summary with zero hours and absence type
  await db.runAsync(`
    INSERT INTO day_summary (id, user_id, date, total_minutes, break_minutes, sessions_count, type, notes, synced_at, updated_at)
    VALUES (?, ?, ?, 0, 0, 0, ?, ?, NULL, datetime('now'))
    ON CONFLICT(user_id, date) DO UPDATE SET
      total_minutes = 0,
      break_minutes = 0,
      sessions_count = 0,
      first_entry = NULL,
      last_exit = NULL,
      primary_location = NULL,
      primary_location_id = NULL,
      type = excluded.type,
      notes = excluded.notes,
      flags = '[]',
      source_mix = '{}',
      synced_at = NULL,
      updated_at = datetime('now')
  `, [generateUUID(), userId, date, type, notes ?? null]);

  await enqueue('SYNC_NOW');
  await enqueue('UI_REFRESH');

  logger.info('USECASE', 'Absence marked', { date, type });
}
