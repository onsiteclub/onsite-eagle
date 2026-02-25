import { getDb } from '../lib/database';
import { generateUUID } from '@onsite/utils/uuid';
import { logger } from '@onsite/logger';

/**
 * Rebuild day_summary from work_sessions for a given user+date.
 * day_summary is ALWAYS derivable from work_sessions — never trust it over sessions.
 * Spec: 04-PERSISTENCE.md "Rebuild day_summary"
 */
export async function rebuildDaySummary(userId: string, date: string): Promise<void> {
  const db = getDb();

  // 1. Aggregate closed sessions
  const agg = await db.getFirstAsync<{
    sessions_count: number;
    total_minutes: number;
    break_minutes: number;
    first_entry: string | null;
    last_exit: string | null;
  }>(`
    SELECT
      COUNT(*) as sessions_count,
      COALESCE(SUM(duration_minutes), 0) as total_minutes,
      COALESCE(SUM(break_seconds), 0) / 60 as break_minutes,
      MIN(time(enter_at)) as first_entry,
      MAX(time(exit_at)) as last_exit
    FROM work_sessions
    WHERE user_id = ? AND date(enter_at) = ?
      AND deleted_at IS NULL AND exit_at IS NOT NULL
  `, [userId, date]);

  if (!agg) return;

  // 2. Check for open session (today, if tracking)
  const openSession = await db.getFirstAsync<{ enter_at: string }>(`
    SELECT enter_at FROM work_sessions
    WHERE user_id = ? AND date(enter_at) = ? AND exit_at IS NULL AND deleted_at IS NULL
  `, [userId, date]);

  // 3. Determine primary location (most hours)
  const primaryLoc = await db.getFirstAsync<{ location_name: string; location_id: string }>(`
    SELECT location_name, location_id FROM work_sessions
    WHERE user_id = ? AND date(enter_at) = ? AND deleted_at IS NULL
    GROUP BY location_id
    ORDER BY SUM(COALESCE(duration_minutes, 0)) DESC
    LIMIT 1
  `, [userId, date]);

  // 4. Build source mix
  const sources = await db.getAllAsync<{ source: string; cnt: number }>(`
    SELECT source, COUNT(*) as cnt FROM work_sessions
    WHERE user_id = ? AND date(enter_at) = ? AND deleted_at IS NULL
    GROUP BY source
  `, [userId, date]);

  const total = sources.reduce((s, r) => s + r.cnt, 0);
  const sourceMix: Record<string, number> = {};
  for (const s of sources) {
    sourceMix[s.source] = Math.round((s.cnt / total) * 100) / 100;
  }

  // 5. Build flags
  const flags: string[] = [];
  if (agg.total_minutes > 600) flags.push('overtime');         // > 10h
  if (agg.total_minutes > 0 && agg.break_minutes === 0 && agg.total_minutes > 420) flags.push('no_break');
  if (agg.total_minutes > 0 && agg.total_minutes < 120) flags.push('early_departure');

  const corrected = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ai_corrections WHERE user_id = ? AND date = ? AND reverted = 0`,
    [userId, date],
  );
  if (corrected && corrected.cnt > 0) flags.push('ai_corrected');

  // 6. Upsert
  const firstEntry = openSession ? timeFromISO(openSession.enter_at) : agg.first_entry;
  const sessionsCount = agg.sessions_count + (openSession ? 1 : 0);

  // Skip upsert if no sessions at all
  if (sessionsCount === 0 && !openSession) return;

  await db.runAsync(`
    INSERT INTO day_summary (id, user_id, date, total_minutes, break_minutes, first_entry, last_exit,
      sessions_count, primary_location, primary_location_id, flags, source_mix, updated_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)
    ON CONFLICT(user_id, date) DO UPDATE SET
      total_minutes = excluded.total_minutes,
      break_minutes = excluded.break_minutes,
      first_entry = excluded.first_entry,
      last_exit = excluded.last_exit,
      sessions_count = excluded.sessions_count,
      primary_location = excluded.primary_location,
      primary_location_id = excluded.primary_location_id,
      flags = excluded.flags,
      source_mix = excluded.source_mix,
      updated_at = datetime('now'),
      synced_at = NULL
  `, [
    generateUUID(),
    userId,
    date,
    agg.total_minutes || 0,
    agg.break_minutes || 0,
    firstEntry,
    agg.last_exit,
    sessionsCount,
    primaryLoc?.location_name ?? null,
    primaryLoc?.location_id ?? null,
    JSON.stringify(flags),
    JSON.stringify(sourceMix),
  ]);

  logger.info('DAY_SUMMARY', 'Rebuilt', { date, minutes: agg.total_minutes, sessions: sessionsCount });
}

/** Extract HH:MM from an ISO string. */
function timeFromISO(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
