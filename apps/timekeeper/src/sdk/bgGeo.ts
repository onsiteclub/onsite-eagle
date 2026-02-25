/**
 * SDK Configuration & Listener Registration.
 *
 * Configures Transistorsoft BackgroundGeolocation with license key,
 * registers geofence/heartbeat listeners, starts monitoring.
 *
 * Spec: 03-SDK.md
 */
import BackgroundGeolocation, {
  State,
  Subscription,
} from 'react-native-background-geolocation';
import { normalizeSdkEvent } from '../tracking/events';
import { handleEvent, checkExpiredCooldown } from '../tracking/engine';
import { drain } from '../tracking/effects';
import { onHeartbeat } from '../tracking/watchdog';
import { checkRecovery } from '../tracking/recovery';
import { logger } from '@onsite/logger';
import { Platform } from 'react-native';

const subscriptions: Subscription[] = [];

/**
 * Configure the SDK with license key and start monitoring.
 * Called once at app boot from _layout.tsx.
 */
export async function configureAndStart(): Promise<State> {
  const license =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_BG_GEO_LICENSE_IOS
      : process.env.EXPO_PUBLIC_BG_GEO_LICENSE_ANDROID;

  if (!license) {
    logger.warn('SDK', 'No Transistorsoft license key — running in manual-only mode');
    return { enabled: false, trackingMode: 0, stopOnTerminate: true, startOnBoot: false } as State;
  }

  const state = await BackgroundGeolocation.ready({
    license,

    // ─── Core ───
    desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    distanceFilter: 10,
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,

    // ─── Geofencing ───
    geofenceProximityRadius: 1000,
    geofenceInitialTriggerEntry: true,

    // ─── Heartbeat (watchdog: 60s, survives Doze) ───
    heartbeatInterval: 60,
    preventSuspend: true,

    // ─── Android foreground service ───
    foregroundService: true,
    notification: {
      title: 'OnSite Timekeeper',
      text: 'Monitoring your work locations',
      channelName: 'OnSite Location',
    },

    // ─── Activity Recognition ───
    stopTimeout: 5,

    // ─── Logging ───
    debug: __DEV__,
    logLevel: __DEV__
      ? BackgroundGeolocation.LOG_LEVEL_VERBOSE
      : BackgroundGeolocation.LOG_LEVEL_WARNING,
  });

  // ─── Register listeners ───

  subscriptions.push(
    BackgroundGeolocation.onGeofence((event) => {
      const normalized = normalizeSdkEvent(event);
      handleEvent(normalized).catch((err) => {
        logger.error('SDK', 'Failed to handle geofence event', { error: String(err) });
      });
    }),
  );

  subscriptions.push(
    BackgroundGeolocation.onHeartbeat(() => {
      onHeartbeat().catch((err) => {
        logger.error('SDK', 'Heartbeat handler failed', { error: String(err) });
      });
    }),
  );

  // Drain effects + check cooldowns on each location update
  subscriptions.push(
    BackgroundGeolocation.onLocation(() => {
      checkExpiredCooldown().catch(() => {});
      drain().catch(() => {});
    }),
  );

  // ─── Start SDK ───
  if (!state.enabled) {
    await BackgroundGeolocation.start();
  }

  // ─── Recovery (rehydrate if app was killed mid-session) ───
  await checkRecovery();

  logger.info('SDK', 'Transistorsoft SDK configured and started', {
    enabled: state.enabled,
    trackingMode: state.trackingMode,
    stopOnTerminate: state.stopOnTerminate,
    startOnBoot: state.startOnBoot,
  });

  return state;
}

/**
 * Remove all event listeners. Called on unmount.
 */
export function removeListeners(): void {
  subscriptions.forEach((sub) => sub.remove());
  subscriptions.length = 0;
}

/**
 * Add a geofence to the SDK's native monitoring.
 */
export async function addSdkGeofence(
  id: string,
  latitude: number,
  longitude: number,
  radius: number,
  notifyOnEntry = true,
  notifyOnExit = true,
): Promise<void> {
  await BackgroundGeolocation.addGeofence({
    identifier: id,
    latitude,
    longitude,
    radius,
    notifyOnEntry,
    notifyOnExit,
    notifyOnDwell: false,
  });
  logger.debug('SDK', 'Geofence added', { id, latitude, longitude, radius });
}

/**
 * Remove a geofence from SDK monitoring.
 */
export async function removeSdkGeofence(id: string): Promise<void> {
  await BackgroundGeolocation.removeGeofence(id);
  logger.debug('SDK', 'Geofence removed', { id });
}

/**
 * Sync all geofences: remove old, add new.
 */
export async function syncGeofencesToSdk(
  fences: Array<{ id: string; latitude: number; longitude: number; radius: number }>,
): Promise<void> {
  await BackgroundGeolocation.removeGeofences();

  const geofences = fences.map((f) => ({
    identifier: f.id,
    latitude: f.latitude,
    longitude: f.longitude,
    radius: f.radius,
    notifyOnEntry: true,
    notifyOnExit: true,
    notifyOnDwell: false,
  }));

  if (geofences.length > 0) {
    await BackgroundGeolocation.addGeofences(geofences);
  }

  logger.info('SDK', `Synced ${geofences.length} geofences to SDK`);
}
