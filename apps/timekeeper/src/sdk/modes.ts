/**
 * GPS Mode Switching — IDLE ↔ ACTIVE.
 *
 * When tracking a session, switch to high-accuracy mode (active).
 * When idle, switch to low-power geofence-only mode.
 *
 * Spec: 03-SDK.md "Mode Switching"
 */
import BackgroundGeolocation from 'react-native-background-geolocation';
import { logger } from '@onsite/logger';

export type GpsMode = 'active' | 'idle';

/**
 * Switch GPS tracking mode.
 * - 'active': high-accuracy continuous tracking (during work session)
 * - 'idle': low-power geofence-only monitoring
 */
export async function switchGpsMode(mode: GpsMode): Promise<void> {
  try {
    await BackgroundGeolocation.changePace(mode === 'active');
    logger.debug('SDK', `GPS mode switched to ${mode}`);
  } catch (error) {
    // changePace can fail if SDK is not started — not critical
    logger.debug('SDK', `switchGpsMode(${mode}) failed`, { error: String(error) });
  }
}
