/**
 * Watchdog — Heartbeat-driven GPS check for missed EXIT events.
 *
 * The SDK's native heartbeat timer survives Doze mode (60s interval).
 * The watchdog uses it to:
 * 1. Check expired cooldowns
 * 2. Drain pending effects
 * 3. Detect if worker left fence without SDK firing EXIT
 *
 * Spec: 03-SDK.md "Watchdog (Heartbeat)"
 */
import BackgroundGeolocation from 'react-native-background-geolocation';
import { logger } from '@onsite/logger';
import { getActiveTracking } from '../persistence/activeTracking';
import { getFenceById } from '../persistence/geofences';
import { checkExpiredCooldown, handleEvent } from './engine';
import { drain } from './effects';
import { makeSyntheticEvent } from './events';
import { checkSessionGuard } from './sessionGuard';

/** Count consecutive "outside fence" readings before generating synthetic EXIT. */
let outsideCount = 0;

/**
 * Haversine distance between two lat/lng points in meters.
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
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
 * Called on every SDK heartbeat (60s interval, survives Doze).
 * Also called by headless task on heartbeat events.
 */
export async function onHeartbeat(): Promise<void> {
  // 1. Check expired cooldowns (might confirm a pending exit)
  await checkExpiredCooldown();

  // 2. Drain any pending effects
  await drain();

  // 3. Session guard check (10h warning, 16h auto-end)
  await checkSessionGuard();

  // 4. If not tracking, nothing to watch
  const state = await getActiveTracking();
  if (state.status !== 'TRACKING') {
    outsideCount = 0;
    return;
  }

  // 5. GPS check — are we still inside the fence?
  if (!state.location_id) return;
  const fence = await getFenceById(state.location_id);
  if (!fence) return;

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
      fence.latitude,
      fence.longitude,
    );

    logger.debug('HEARTBEAT', 'GPS check', {
      distance: Math.round(distance),
      radius: fence.radius,
      accuracy: Math.round(pos.coords.accuracy),
      inside: distance <= fence.radius,
    });

    if (distance > fence.radius) {
      outsideCount++;
      if (outsideCount >= 2) {
        // 2 consecutive readings outside = real exit
        outsideCount = 0;
        logger.info('WATCHDOG', 'Synthetic EXIT — worker outside fence for 2+ checks', {
          distance: Math.round(distance),
          radius: fence.radius,
          fenceId: fence.id,
        });
        await handleEvent(makeSyntheticEvent('exit', fence.id, 'watchdog', 0.7));
      }
    } else {
      outsideCount = 0; // Back inside → reset
    }
  } catch (error) {
    // GPS failed → don't count as outside (conservative)
    logger.debug('HEARTBEAT', 'GPS check failed, skipping', {
      error: String(error),
    });
  }
}

/**
 * Reset the watchdog counter. Called when tracking state changes.
 */
export function resetWatchdog(): void {
  outsideCount = 0;
}
