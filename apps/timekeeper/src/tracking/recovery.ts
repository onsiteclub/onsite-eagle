/**
 * Recovery — Post-start/restart GPS checks.
 *
 * If the app was killed and restarted, the worker might already be inside a fence.
 * We check GPS on boot and inject synthetic ENTER if needed.
 *
 * Spec: 03-SDK.md "Recovery (Post-Start/Restart GPS Checks)"
 *
 * RULES:
 * - Post-start NEVER injects EXIT (first-boot GPS may be wildly inaccurate)
 * - Only heartbeat watchdog injects synthetic exits
 * - Synthetic ENTER confidence = 0.5 (lower than SDK's 1.0)
 */
import BackgroundGeolocation from 'react-native-background-geolocation';
import { logger } from '@onsite/logger';
import { getUserId } from '@onsite/auth/core';
import { getActiveTracking, setActiveTracking, setActiveTrackingLocationName } from '../persistence/activeTracking';
import { getActiveFences } from '../persistence/geofences';
import { getDb } from '../lib/database';
import { handleEvent } from './engine';
import { makeSyntheticEvent } from './events';

/**
 * Haversine distance between two lat/lng points in meters.
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Run recovery check after SDK start/restart.
 *
 * 1. If an open session exists in DB but active_tracking is IDLE (crash scenario),
 *    rehydrate active_tracking to match the open session — no new session created.
 * 2. If no open session AND IDLE AND worker is inside a fence, inject synthetic ENTER.
 */
export async function checkRecovery(): Promise<void> {
  const state = await getActiveTracking();

  // If already TRACKING or EXIT_PENDING, engine is handling it
  if (state.status !== 'IDLE') {
    logger.debug('BOOT', 'Recovery skip — already in state', { status: state.status });
    return;
  }

  const userId = await getUserId();
  if (!userId) {
    logger.debug('BOOT', 'Recovery skip — no user ID');
    return;
  }

  // Step 1: Check DB for orphaned open session (crash recovery)
  const db = getDb();
  const orphan = await db.getFirstAsync<{
    id: string;
    location_id: string | null;
    location_name: string | null;
    enter_at: string;
  }>(
    `SELECT id, location_id, location_name, enter_at FROM work_sessions
     WHERE user_id = ? AND exit_at IS NULL AND deleted_at IS NULL
     ORDER BY enter_at DESC LIMIT 1`,
    [userId],
  );

  if (orphan) {
    // Rehydrate active_tracking — do NOT create a new session
    await setActiveTracking('TRACKING', orphan.id, null, {});
    // Manually set location fields (setActiveTracking with null event uses COALESCE)
    await db.runAsync(
      `UPDATE active_tracking SET
        location_id = ?,
        enter_at = ?,
        updated_at = datetime('now')
      WHERE id = 'current'`,
      [orphan.location_id, orphan.enter_at],
    );
    if (orphan.location_name) {
      await setActiveTrackingLocationName(orphan.location_name);
    }
    logger.info('BOOT', 'Recovery: rehydrated active_tracking from orphan session', {
      sessionId: orphan.id,
      fence: orphan.location_name ?? orphan.location_id,
    });
    return;
  }

  // Step 2: No open session — check GPS for synthetic ENTER
  const fences = await getActiveFences(userId);
  if (fences.length === 0) {
    logger.debug('BOOT', 'Recovery skip — no active fences');
    return;
  }

  try {
    const pos = await BackgroundGeolocation.getCurrentPosition({
      samples: 1,
      persist: false,
      desiredAccuracy: 50,
      timeout: 15,
    });

    // Check against all fences
    for (const fence of fences) {
      const distance = calculateDistance(
        pos.coords.latitude,
        pos.coords.longitude,
        fence.latitude,
        fence.longitude,
      );

      if (distance <= fence.radius) {
        logger.info('BOOT', 'Recovery: worker inside fence — injecting synthetic ENTER', {
          fenceId: fence.id,
          fenceName: fence.name,
          distance: Math.round(distance),
          radius: fence.radius,
          accuracy: Math.round(pos.coords.accuracy),
        });

        await handleEvent(makeSyntheticEvent('enter', fence.id, 'gps_check', 0.5));
        return; // Only match first fence
      }
    }

    logger.debug('BOOT', 'Recovery: not inside any fence');
  } catch (error) {
    // GPS failed on boot — don't inject anything
    logger.debug('BOOT', 'Recovery GPS failed, skipping', { error: String(error) });
  }
}

/**
 * Recovery after fence config change (radius update, etc.).
 * Waits 5s for fresh GPS then checks position.
 *
 * Spec: "After restartMonitoring()"
 * - Inside fence + no tracking → inject ENTER
 * - Outside fence + tracking active → inject EXIT (only if accuracy < 50m)
 * - Otherwise → do nothing
 */
export async function checkAfterFenceChange(
  fenceId: string,
  latitude: number,
  longitude: number,
  radius: number,
): Promise<void> {
  // Wait 5 seconds for fresh GPS
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const state = await getActiveTracking();

  try {
    const pos = await BackgroundGeolocation.getCurrentPosition({
      samples: 1,
      persist: false,
      desiredAccuracy: 20,
      timeout: 10,
    });

    const distance = calculateDistance(
      pos.coords.latitude,
      pos.coords.longitude,
      latitude,
      longitude,
    );

    const inside = distance <= radius;

    if (inside && state.status === 'IDLE') {
      // Inside fence but not tracking → inject ENTER
      logger.info('RECOVERY', 'Post-fence-change: inside fence, injecting ENTER', {
        fenceId,
        distance: Math.round(distance),
      });
      await handleEvent(makeSyntheticEvent('enter', fenceId, 'gps_check', 0.5));
    } else if (!inside && state.status === 'TRACKING' && state.location_id === fenceId) {
      // Outside fence but tracking → inject EXIT only if GPS is accurate
      if (pos.coords.accuracy < 50) {
        logger.info('RECOVERY', 'Post-fence-change: outside fence, injecting EXIT', {
          fenceId,
          distance: Math.round(distance),
          accuracy: Math.round(pos.coords.accuracy),
        });
        await handleEvent(makeSyntheticEvent('exit', fenceId, 'gps_check', 0.5));
      }
    }
  } catch (error) {
    logger.debug('RECOVERY', 'Post-fence-change GPS failed', { error: String(error) });
  }
}
