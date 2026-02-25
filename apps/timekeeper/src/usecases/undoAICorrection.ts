/**
 * Undo AI Correction — Revert Secretary AI changes for a given date.
 *
 * Restores original values from ai_corrections table, marks them as reverted,
 * and rebuilds day_summary (which removes ai_corrected flag).
 *
 * Spec: 06-USECASES.md "usecases/undoAICorrection.ts"
 */
import { getDb } from '../lib/database';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';
import type { AICorrection } from '@onsite/shared';
import { rebuildDaySummary } from '../persistence/daySummary';
import { enqueue } from '../tracking/effects';

/**
 * Revert all AI corrections for a date. Returns true if any were reverted.
 */
export async function undoAICorrection(date: string): Promise<boolean> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId) throw new Error('No authenticated user');

  // 1. Find non-reverted corrections for this date
  const corrections = await db.getAllAsync<AICorrection>(
    `SELECT * FROM ai_corrections WHERE user_id = ? AND date = ? AND reverted = 0`,
    [userId, date],
  );

  if (corrections.length === 0) return false;

  // 2. Revert each correction on its session
  for (const c of corrections) {
    if (c.session_id) {
      // Restore original value, set source back to 'manual' (worker override)
      await db.runAsync(
        `UPDATE work_sessions SET
          ${c.field} = ?,
          source = 'manual',
          synced_at = NULL,
          updated_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL`,
        [c.original_value, c.session_id],
      );
    }

    // Mark correction as reverted
    await db.runAsync(
      `UPDATE ai_corrections SET reverted = 1 WHERE id = ?`,
      [c.id],
    );
  }

  // 3. Rebuild day_summary (removes ai_corrected flag)
  await rebuildDaySummary(userId, date);

  // 4. Effects
  await enqueue('SYNC_NOW');
  await enqueue('UI_REFRESH');

  logger.info('USECASE', 'AI corrections undone', {
    date,
    count: corrections.length,
    fields: corrections.map((c) => c.field),
  });

  return true;
}
