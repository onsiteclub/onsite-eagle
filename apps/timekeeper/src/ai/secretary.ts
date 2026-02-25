/**
 * Secretary AI — Daily cleanup of work sessions.
 *
 * Flow: confirmExit() → effects queue AI_CLEANUP → cleanupDay()
 *   → reads day's sessions
 *   → builds worker profile (30-day averages)
 *   → calls @onsite/ai callAI({ specialist: 'timekeeper:secretary' })
 *   → if corrections: calls usecases/editSession (source='secretary')
 *   → if no corrections: done
 *
 * Always non-blocking. Always optional. Worker can undo via undoAICorrection.
 *
 * Spec: 07-AI.md "Secretary AI"
 */
import { callAI } from '@onsite/ai';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';
import { supabase } from '../lib/supabase';
import { getSessionsForDate } from '../persistence/sessions';
import { editSession } from '../usecases/editSession';
import { buildWorkerProfile } from './profile';
import type { WorkSession } from '@onsite/shared';

interface SecretaryCorrection {
  session_id?: string;
  field: string;
  from: string;
  to: string;
  reason: string;
}

interface SecretaryResponse {
  corrections: SecretaryCorrection[];
  flags?: string[];
}

/**
 * Format a session for AI context (only what the AI needs).
 */
function formatSessionForAI(s: WorkSession) {
  return {
    id: s.id,
    enter_at: s.enter_at,
    exit_at: s.exit_at,
    duration_minutes: s.duration_minutes,
    break_seconds: s.break_seconds,
    source: s.source,
    fence_name: s.fence_name,
    notes: s.notes,
  };
}

/**
 * Run Secretary AI cleanup on a specific date.
 * Called by effects queue after each confirmExit.
 *
 * Returns the number of corrections applied (0 if none).
 */
export async function cleanupDay(date: string): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;

  // 1. Read sessions for the date
  const sessions = await getSessionsForDate(userId, date);
  if (sessions.length === 0) {
    logger.debug('AI', 'Secretary: no sessions for date', { date });
    return 0;
  }

  // Skip if all sessions are voice/manual (AI won't touch them)
  const allProtected = sessions.every((s) => s.source === 'voice' || s.source === 'manual');
  if (allProtected) {
    logger.debug('AI', 'Secretary: all sessions protected (voice/manual)', { date });
    return 0;
  }

  // 2. Build worker profile
  const profile = await buildWorkerProfile(userId);

  // 3. Call AI
  const response = await callAI(
    {
      specialist: 'timekeeper:secretary',
      context: {
        mode: 'daily_cleanup',
        date,
        sessions: sessions.map(formatSessionForAI),
        worker_profile: profile,
      },
    },
    supabase,
  );

  // Check for fallback / error
  if (response.action === 'error' || !response.data) {
    logger.debug('AI', 'Secretary: AI unavailable, skipping cleanup', { date });
    return 0;
  }

  // 4. Parse corrections
  const result = response.data as unknown as SecretaryResponse;
  const corrections = result.corrections || [];

  if (corrections.length === 0) {
    logger.info('AI', 'Secretary: no corrections needed', { date });
    return 0;
  }

  // 5. Apply corrections via editSession use case
  let applied = 0;
  for (const correction of corrections) {
    try {
      // Build changes object from correction
      const changes: Record<string, unknown> = {};
      if (correction.field === 'enter_at' || correction.field === 'exit_at') {
        // AI returns HH:MM — convert to full ISO for the date
        changes[correction.field] = `${date}T${correction.to}:00`;
      } else if (correction.field === 'break_seconds') {
        changes.break_seconds = parseInt(correction.to, 10);
      }

      if (Object.keys(changes).length === 0) continue;

      await editSession({
        sessionId: correction.session_id,
        date,
        userId,
        changes: changes as { enter_at?: string; exit_at?: string; break_seconds?: number },
        source: 'secretary',
        reason: correction.reason,
      });

      applied++;
      logger.info('AI', 'Secretary correction applied', {
        date,
        session: correction.session_id,
        field: correction.field,
        from: correction.from,
        to: correction.to,
      });
    } catch (error) {
      // Individual correction failure shouldn't stop others
      logger.warn('AI', 'Secretary correction failed', {
        date,
        correction,
        error: String(error),
      });
    }
  }

  logger.info('AI', 'Secretary cleanup complete', {
    date,
    corrections: corrections.length,
    applied,
    flags: result.flags || [],
  });

  return applied;
}
