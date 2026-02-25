/**
 * Session Guard — Prevents unrealistic sessions.
 *
 * - 10h: Warning notification ("Still working?")
 * - 16h: Auto-end session with reason "session_guard"
 *
 * The guard runs on every heartbeat while TRACKING.
 * It uses the active_tracking enter_at to calculate elapsed time.
 *
 * Spec: 03-SDK.md "session guard (10h warning → 16h auto-end)"
 */
import { logger } from '@onsite/logger';
import { getActiveTracking } from '../persistence/activeTracking';
import { handleEvent } from './engine';
import { makeSyntheticEvent } from './events';

const TEN_HOURS_MS = 10 * 60 * 60 * 1000;
const SIXTEEN_HOURS_MS = 16 * 60 * 60 * 1000;

/** Track whether we've already sent the 10h warning (reset on session end) */
let warningFired = false;

/**
 * Check session duration and enforce guards.
 * Called on every heartbeat (60s), after watchdog GPS check.
 */
export async function checkSessionGuard(): Promise<void> {
  const state = await getActiveTracking();
  if (state.status !== 'TRACKING' || !state.enter_at) return;

  const elapsed = Date.now() - new Date(state.enter_at).getTime();

  // 16h auto-end — force close the session
  if (elapsed >= SIXTEEN_HOURS_MS) {
    logger.warn('SESSION', 'Session guard: 16h auto-end triggered', {
      session: state.session_id,
      elapsed: `${Math.round(elapsed / 3600000)}h`,
    });

    if (state.location_id) {
      await handleEvent(makeSyntheticEvent('exit', state.location_id, 'watchdog', 0.5));
    }

    warningFired = false;
    return;
  }

  // 10h warning — notify worker once
  if (elapsed >= TEN_HOURS_MS && !warningFired) {
    warningFired = true;
    logger.info('SESSION', 'Session guard: 10h warning', {
      session: state.session_id,
      elapsed: `${Math.round(elapsed / 3600000)}h`,
    });

    // The notification effect is stubbed in Phase 2, will be implemented later.
    // For now, just log it. The UI can poll this via active_tracking.
    // Future: await enqueue('NOTIFY_SESSION_LONG');
  }
}

/**
 * Reset the guard state. Called when a session ends (from effects executor).
 */
export function resetSessionGuard(): void {
  warningFired = false;
}
