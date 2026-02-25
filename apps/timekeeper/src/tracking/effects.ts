import { getDb } from '../lib/database';
import { getUserId } from '@onsite/auth/core';
import { rebuildDaySummary } from '../persistence/daySummary';
import { logger } from '@onsite/logger';
import { switchGpsMode } from '../sdk/modes';
import { resetSessionGuard } from './sessionGuard';
import { syncNow, OfflineError } from '../sync/syncEngine';
import { cleanupDay } from '../ai/secretary';
import type { EffectType, QueuedEffect } from '@onsite/shared';

// ─── Classification ─────────────────────────────────────────

/** Critical effects retry indefinitely with backoff. Normal effects fail after 3. */
const CRITICAL_EFFECTS: ReadonlySet<string> = new Set([
  'SYNC_NOW',
  'REBUILD_DAY_SUMMARY',
  'AI_CLEANUP',
]);

/** Backoff schedule in minutes for critical effects. Last value is the cap. */
const BACKOFF_MINUTES = [1, 5, 15, 60];

function isCritical(type: string): boolean {
  return CRITICAL_EFFECTS.has(type);
}

function computeNextRunAt(retryCount: number): string {
  const delayMin = BACKOFF_MINUTES[Math.min(retryCount, BACKOFF_MINUTES.length - 1)];
  const nextRun = new Date(Date.now() + delayMin * 60_000);
  return nextRun.toISOString();
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Enqueue a side effect. Engine NEVER executes effects inline.
 * Spec: 02-TRACKING-ENGINE.md "Effects Queue"
 */
export async function enqueue(type: EffectType, payload?: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const priority = isCritical(type) ? 'critical' : 'normal';
  await db.runAsync(
    `INSERT INTO effects_queue (effect_type, payload, priority) VALUES (?, ?, ?)`,
    [type, payload ? JSON.stringify(payload) : null, priority],
  );
  // Try to drain immediately (fire-and-forget)
  drain().catch(() => {});
}

/**
 * Drain all pending effects in FIFO order.
 * Called: after every engine transition, on AppState→active, on heartbeat.
 *
 * - Skips effects with next_run_at in the future (backoff).
 * - Critical effects: retry indefinitely with exponential backoff.
 * - Normal effects: fail permanently after 3 retries.
 */
export async function drain(): Promise<void> {
  const db = getDb();
  const pending = await db.getAllAsync<QueuedEffect>(
    `SELECT * FROM effects_queue
     WHERE status = 'pending'
       AND (next_run_at IS NULL OR next_run_at <= datetime('now'))
     ORDER BY id ASC`,
  );

  for (const effect of pending) {
    try {
      await execute(effect);
      await db.runAsync(
        `UPDATE effects_queue SET status = 'done', executed_at = datetime('now') WHERE id = ?`,
        [effect.id],
      );
    } catch (error) {
      const retries = (effect.retry_count || 0) + 1;
      const critical = isCritical(effect.effect_type);

      if (critical) {
        // Critical: never die. Schedule retry with backoff.
        // OfflineError gets shortest backoff (will retry on next drain after reconnect).
        const isOffline = error instanceof OfflineError;
        const backoffRetries = isOffline ? 0 : retries; // offline always uses 1-min backoff
        const nextRunAt = computeNextRunAt(backoffRetries);
        await db.runAsync(
          `UPDATE effects_queue SET retry_count = ?, next_run_at = ? WHERE id = ?`,
          [retries, nextRunAt, effect.id],
        );
        logger.debug('EFFECT', `Critical effect deferred: ${effect.effect_type}`, {
          id: effect.id,
          retries,
          nextRunAt,
          offline: isOffline,
        });
      } else if (retries >= 3) {
        // Normal: 3 strikes and out
        await db.runAsync(
          `UPDATE effects_queue SET status = 'failed' WHERE id = ?`,
          [effect.id],
        );
        logger.warn('EFFECT', `Effect failed permanently: ${effect.effect_type}`, {
          id: effect.id,
          error: String(error),
        });
      } else {
        await db.runAsync(
          `UPDATE effects_queue SET retry_count = ? WHERE id = ?`,
          [retries, effect.id],
        );
      }
    }
  }
}

/**
 * Execute a single effect.
 */
async function execute(effect: QueuedEffect): Promise<void> {
  const payload = effect.payload ? JSON.parse(effect.payload) : {};

  switch (effect.effect_type as EffectType) {
    case 'REBUILD_DAY_SUMMARY': {
      const userId = await getUserId();
      if (userId && payload.date) {
        await rebuildDaySummary(userId, payload.date);
      }
      break;
    }

    case 'UI_REFRESH':
      // Zustand stores auto-update via subscriptions.
      // This effect exists to trigger manual refreshes if needed.
      break;

    case 'SWITCH_GPS_MODE':
      if (payload.mode === 'active' || payload.mode === 'idle') {
        await switchGpsMode(payload.mode);
      }
      break;

    case 'NOTIFY_ARRIVAL':
    case 'NOTIFY_DEPARTURE':
    case 'NOTIFY_PAUSED':
    case 'NOTIFY_RESUMED':
      // Stubs — notifications not yet implemented.
      // These effects are no longer enqueued (removed from engine/usecases).
      // Kept here for forward-compatibility if re-added later.
      logger.debug('EFFECT', `[stub] ${effect.effect_type}`);
      break;

    case 'START_SESSION_GUARD':
      // Guard runs on each heartbeat via watchdog → checkSessionGuard().
      // This effect just resets the warning flag for a fresh session.
      resetSessionGuard();
      break;

    case 'CANCEL_SESSION_GUARD':
      resetSessionGuard();
      break;

    case 'SYNC_NOW':
      // syncNow() throws OfflineError if offline — handled by drain().
      await syncNow();
      break;

    case 'AI_CLEANUP':
      if (payload.date) {
        await cleanupDay(payload.date);
      }
      break;

    default:
      logger.warn('EFFECT', `Unknown effect type: ${effect.effect_type}`);
  }
}
