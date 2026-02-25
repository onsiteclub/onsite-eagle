/**
 * TrackingEngine — THE ONLY FILE THAT MAKES TRACKING DECISIONS.
 *
 * State machine: IDLE → TRACKING → EXIT_PENDING → IDLE
 * All guards and dedup live here. No other file may make tracking decisions.
 *
 * Spec: 02-TRACKING-ENGINE.md
 */
import { logger } from '@onsite/logger';
import type { TrackingEvent, ActiveTracking } from '@onsite/shared';
import {
  getActiveTracking,
  setActiveTracking,
  setActiveTrackingLocationName,
  clearActiveTracking,
  updateCooldown,
} from '../persistence/activeTracking';
import {
  createOpenSession,
  setSessionLocationName,
  closeSession,
  calculateDuration,
} from '../persistence/sessions';
import { getFenceById } from '../persistence/geofences';
import { logGeofenceEvent, logLocationAudit } from '../persistence/geofenceEvents';
import { enqueue } from './effects';

// ─── Helpers ─────────────────────────────────────────────────

function addSeconds(isoDate: string, seconds: number): string {
  return new Date(new Date(isoDate).getTime() + seconds * 1000).toISOString();
}

function dateOf(isoDate: string): string {
  return isoDate.slice(0, 10); // YYYY-MM-DD
}

const COOLDOWN_SECONDS = 30;

// ─── Public API ──────────────────────────────────────────────

/**
 * Process a normalized TrackingEvent through the state machine.
 * This is the SINGLE entry point for all tracking decisions.
 */
export async function handleEvent(event: TrackingEvent): Promise<void> {
  // Always check expired cooldowns first
  await checkExpiredCooldown();

  // Log the raw event for audit
  await logGeofenceEvent(event);

  const state = await getActiveTracking();

  logger.info('ENGINE', `Event: ${event.type} | State: ${state.status}`, {
    fence: event.fenceId,
    source: event.source,
    confidence: event.confidence,
  });

  switch (state.status) {
    case 'IDLE':
      await handleIdle(state, event);
      break;

    case 'TRACKING':
      await handleTracking(state, event);
      break;

    case 'EXIT_PENDING':
      await handleExitPending(state, event);
      break;
  }
}

/**
 * Check and process expired cooldowns.
 * Called at the start of every handleEvent, on every heartbeat, and on AppState→active.
 */
export async function checkExpiredCooldown(): Promise<void> {
  const state = await getActiveTracking();

  if (state.status === 'EXIT_PENDING' && state.cooldown_expires_at) {
    if (new Date() >= new Date(state.cooldown_expires_at)) {
      logger.info('ENGINE', 'Cooldown expired — confirming exit');
      await confirmExit(state, state.exit_at!);
    }
  }
}

// ─── State Handlers ──────────────────────────────────────────

async function handleIdle(_state: ActiveTracking, event: TrackingEvent): Promise<void> {
  if (event.type === 'enter') {
    // Create open session
    const sessionId = await createOpenSession(event);

    // Resolve fence name
    const fence = await getFenceById(event.fenceId);
    if (fence) {
      await setSessionLocationName(sessionId, fence.name);
    }

    // Update active_tracking → TRACKING
    await setActiveTracking('TRACKING', sessionId, event);
    if (fence) {
      await setActiveTrackingLocationName(fence.name);
    }

    // Log GPS proof
    await logLocationAudit(event, sessionId, fence?.name ?? null);

    // Enqueue effects (never execute inline)
    await enqueue('SWITCH_GPS_MODE', { mode: 'active' });
    await enqueue('REBUILD_DAY_SUMMARY', { date: dateOf(event.occurredAt) });
    await enqueue('START_SESSION_GUARD');
    await enqueue('UI_REFRESH');

    logger.info('ENGINE', 'IDLE → TRACKING', { session: sessionId, fence: fence?.name });
  }
  // EXIT while IDLE → ignore silently (guard)
}

async function handleTracking(state: ActiveTracking, event: TrackingEvent): Promise<void> {
  if (event.type === 'exit' && event.fenceId === state.location_id) {
    // Exit matching fence → start cooldown
    const now = new Date().toISOString();
    await setActiveTracking('EXIT_PENDING', state.session_id, null, {
      exit_at: event.occurredAt,
      cooldown_expires_at: addSeconds(now, COOLDOWN_SECONDS),
    });

    // Log GPS proof
    await logLocationAudit(event, state.session_id, state.location_name);

    logger.info('ENGINE', 'TRACKING → EXIT_PENDING', {
      session: state.session_id,
      cooldown: `${COOLDOWN_SECONDS}s`,
    });
  } else if (event.type === 'enter' && event.fenceId === state.location_id) {
    // Already tracking same fence → dedup, ignore
    logger.debug('ENGINE', 'Dedup: enter same fence while TRACKING, ignored');
  } else if (event.type === 'enter' && event.fenceId !== state.location_id) {
    // Different fence → close current session, start new one
    logger.info('ENGINE', 'Different fence enter — closing current session');
    await confirmExit(state, event.occurredAt);
    // Recurse for the new ENTER (state is now IDLE)
    await handleEvent(event);
  } else if (event.type === 'exit' && event.fenceId !== state.location_id) {
    // Exit from a different fence → stale event, ignore (guard)
    logger.debug('ENGINE', 'Stale exit from different fence, ignored', {
      active: state.location_id,
      event: event.fenceId,
    });
  }
}

async function handleExitPending(state: ActiveTracking, event: TrackingEvent): Promise<void> {
  if (event.type === 'enter' && event.fenceId === state.location_id) {
    // Re-entry during cooldown → cancel exit, back to TRACKING
    await setActiveTracking('TRACKING', state.session_id, null, {
      exit_at: null,
      cooldown_expires_at: null,
    });
    // Preserve location_name from before
    if (state.location_name) {
      await setActiveTrackingLocationName(state.location_name);
    }

    logger.info('ENGINE', 'EXIT_PENDING → TRACKING (re-entry during cooldown)');
    await enqueue('UI_REFRESH');
  } else if (event.type === 'exit') {
    // Another EXIT → reset cooldown timer
    const now = new Date().toISOString();
    await updateCooldown(addSeconds(now, COOLDOWN_SECONDS));
    logger.debug('ENGINE', 'Cooldown reset on additional exit event');
  } else if (event.type === 'enter' && event.fenceId !== state.location_id) {
    // Enter different fence during cooldown → confirm exit, then handle new enter
    logger.info('ENGINE', 'Different fence during cooldown — confirming exit first');
    await confirmExit(state, state.exit_at!);
    await handleEvent(event);
  }
}

// ─── Confirm Exit ────────────────────────────────────────────

/**
 * Finalize session close: update work_session, clear active_tracking, enqueue effects.
 * Spec: 02-TRACKING-ENGINE.md "confirmExit()"
 */
async function confirmExit(state: ActiveTracking, exitTime: string): Promise<void> {
  if (!state.session_id || !state.enter_at) {
    logger.warn('ENGINE', 'confirmExit called with no session/enter_at');
    await clearActiveTracking();
    return;
  }

  const pauseSeconds = state.pause_seconds || 0;
  const duration = calculateDuration(state.enter_at, exitTime, pauseSeconds);

  // 1. Close the work_session
  await closeSession(state.session_id, exitTime, pauseSeconds, duration);

  // 2. Clear active_tracking → IDLE
  await clearActiveTracking();

  // 3. Enqueue effects (never execute inline)
  await enqueue('SWITCH_GPS_MODE', { mode: 'idle' });
  await enqueue('CANCEL_SESSION_GUARD');
  await enqueue('REBUILD_DAY_SUMMARY', { date: dateOf(state.enter_at) });
  await enqueue('SYNC_NOW');
  await enqueue('AI_CLEANUP', { date: dateOf(state.enter_at) });
  await enqueue('UI_REFRESH');

  logger.info('ENGINE', 'Session confirmed', {
    session: state.session_id,
    duration,
    pause: pauseSeconds,
  });
}
