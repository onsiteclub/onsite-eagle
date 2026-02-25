/**
 * Worker Profile — Build a 30-day statistical profile for AI context.
 *
 * Used by: Secretary AI (to know worker's normal patterns),
 *          Voice AI (to answer "what's my average?").
 *
 * Spec: 07-AI.md "Worker Profile"
 */
import { getDb } from '../lib/database';
import type { WorkerProfile } from '@onsite/ai';

interface SessionRow {
  enter_at: string;
  exit_at: string;
  duration_minutes: number;
  break_seconds: number;
  source: string;
  fence_name: string | null;
}

/**
 * Extract HH:MM time from an ISO datetime string.
 */
function extractTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Convert HH:MM to minutes since midnight for averaging.
 */
function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes since midnight back to HH:MM.
 */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Compute the average of an array of numbers.
 */
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Detect work pattern from session timing variance.
 */
function detectPattern(rows: SessionRow[]): 'regular' | 'variable' | 'shift_work' {
  if (rows.length < 5) return 'regular';

  const entryMinutes = rows.map((r) => timeToMinutes(extractTime(r.enter_at)));
  const stdDev = Math.sqrt(
    average(entryMinutes.map((m) => Math.pow(m - average(entryMinutes), 2))),
  );

  // > 2 hour std dev in entry times = shift work
  if (stdDev > 120) return 'shift_work';
  // > 45 min std dev = variable
  if (stdDev > 45) return 'variable';
  return 'regular';
}

/**
 * Build a worker profile from the last 30 days of completed sessions.
 * Excludes secretary-corrected data to avoid feedback loops.
 */
export async function buildWorkerProfile(userId: string): Promise<WorkerProfile> {
  const db = getDb();

  const rows = await db.getAllAsync<SessionRow>(`
    SELECT enter_at, exit_at, duration_minutes, break_seconds, source,
           fence_name
    FROM work_sessions
    WHERE user_id = ? AND date(enter_at) >= date('now', '-30 days')
      AND deleted_at IS NULL AND exit_at IS NOT NULL AND source != 'secretary'
    ORDER BY enter_at DESC
  `, [userId]);

  // Default profile when insufficient data
  if (rows.length < 3) {
    return {
      avg_entry: '07:00',
      avg_exit: '16:00',
      avg_shift_hours: 8.5,
      avg_break_min: 30,
      data_points: rows.length,
      pattern: 'insufficient_data',
    };
  }

  const entryTimes = rows.map((r) => timeToMinutes(extractTime(r.enter_at)));
  const exitTimes = rows.map((r) => timeToMinutes(extractTime(r.exit_at)));
  const durations = rows.map((r) => r.duration_minutes);
  const breaks = rows.map((r) => r.break_seconds);

  return {
    avg_entry: minutesToTime(average(entryTimes)),
    avg_exit: minutesToTime(average(exitTimes)),
    avg_shift_hours: Math.round((average(durations) / 60) * 10) / 10,
    avg_break_min: Math.round(average(breaks) / 60),
    data_points: rows.length,
    pattern: detectPattern(rows),
  };
}
