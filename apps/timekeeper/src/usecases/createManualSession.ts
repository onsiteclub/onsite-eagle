/**
 * Create Manual Session — Insert a complete work_session from manual/voice input.
 *
 * Spec: 06-USECASES.md "usecases/createManualSession.ts"
 */
import { getDb } from '../lib/database';
import { generateUUID } from '@onsite/utils/uuid';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';
import { calculateDuration } from '../persistence/sessions';
import { rebuildDaySummary } from '../persistence/daySummary';
import { enqueue } from '../tracking/effects';

export interface ManualSessionInput {
  date: string;           // YYYY-MM-DD
  enterTime: string;      // HH:MM
  exitTime: string;       // HH:MM
  breakMinutes: number;
  locationId?: string;
  locationName?: string;
  source: 'manual' | 'voice';
  notes?: string;
}

/**
 * Create a completed work session from manual or voice input.
 */
export async function createManualSession(input: ManualSessionInput): Promise<string> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId) throw new Error('No authenticated user');

  const enterAt = `${input.date}T${input.enterTime}:00`;
  const exitAt = `${input.date}T${input.exitTime}:00`;
  const breakSeconds = input.breakMinutes * 60;
  const duration = calculateDuration(enterAt, exitAt, breakSeconds);

  const id = generateUUID();

  await db.runAsync(
    `INSERT INTO work_sessions (id, user_id, location_id, location_name, enter_at, exit_at,
      break_seconds, duration_minutes, source, confidence, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0, ?)`,
    [
      id,
      userId,
      input.locationId ?? null,
      input.locationName ?? null,
      enterAt,
      exitAt,
      breakSeconds,
      duration,
      input.source,
      input.notes ?? null,
    ],
  );

  await rebuildDaySummary(userId, input.date);

  await enqueue('SYNC_NOW');
  await enqueue('UI_REFRESH');

  logger.info('USECASE', 'Manual session created', {
    id,
    date: input.date,
    source: input.source,
    duration,
  });

  return id;
}
