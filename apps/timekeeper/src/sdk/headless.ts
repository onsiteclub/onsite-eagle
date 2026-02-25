/**
 * Headless Task Registration (Android).
 *
 * When the app is terminated, Android can still receive geofence/heartbeat
 * events via the headless task. Runs WITHOUT a React component tree.
 *
 * Spec: 03-SDK.md "Headless Mode"
 */
import BackgroundGeolocation from 'react-native-background-geolocation';
import { normalizeHeadlessEvent } from '../tracking/events';
import { handleEvent, checkExpiredCooldown } from '../tracking/engine';
import { drain } from '../tracking/effects';
import { onHeartbeat } from '../tracking/watchdog';
import { logger } from '@onsite/logger';

BackgroundGeolocation.registerHeadlessTask(async (event) => {
  const { name, params } = event;

  logger.debug('SDK', `Headless event: ${name}`, params);

  switch (name) {
    case 'geofence': {
      const normalized = normalizeHeadlessEvent(params);
      await handleEvent(normalized);
      break;
    }

    case 'heartbeat': {
      await onHeartbeat();
      break;
    }

    case 'location': {
      await checkExpiredCooldown();
      await drain();
      break;
    }

    default:
      logger.debug('SDK', `Headless event ignored: ${name}`);
  }
});
