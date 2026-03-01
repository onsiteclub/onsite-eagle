/**
 * Push notification registration for Operator app.
 *
 * Gets an Expo Push Token and saves it to core_devices.
 * Uses Expo Push Notifications service (handles FCM/APNs under the hood).
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '@onsite/logger';
import { supabase } from './supabase';

/**
 * Register for push notifications and save the token to core_devices.
 *
 * Call this after the user is authenticated and the app is ready.
 * Safe to call multiple times — will update the existing device record.
 */
export async function registerPushToken(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    logger.debug('NOTIFY', 'Skipping push registration on emulator/simulator');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.info('NOTIFY', 'Push permission not granted');
    return null;
  }

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F766E',
    });

    await Notifications.setNotificationChannelAsync('material_requests', {
      name: 'Material Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B30',
    });
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[push] No EAS project ID found — push token registration skipped');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    logger.info('NOTIFY', 'Expo push token obtained', { token });

    // Save token to core_devices
    await savePushToken(token);

    return token;
  } catch (error) {
    console.error('[push] Failed to get push token:', error);
    return null;
  }
}

/**
 * Save the push token to core_devices table.
 * Upserts based on user_id + app_name.
 */
async function savePushToken(token: string): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const userId = authData.user.id;

    // Check if device record exists for this user + app
    const { data: existing } = await supabase
      .from('core_devices')
      .select('id')
      .eq('user_id', userId)
      .eq('app_name', 'operator')
      .maybeSingle();

    if (existing) {
      // Update existing record
      await supabase
        .from('core_devices')
        .update({
          push_token: token,
          push_enabled: true,
          push_token_updated_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          platform: Platform.OS as 'ios' | 'android',
          device_name: Device.deviceName || null,
          model: Device.modelName || null,
          manufacturer: Device.manufacturer || null,
          os_version: Device.osVersion || null,
        })
        .eq('id', existing.id);
    } else {
      // Create new device record
      await supabase
        .from('core_devices')
        .insert({
          user_id: userId,
          device_id: `operator-${Date.now()}`,
          device_name: Device.deviceName || null,
          platform: Platform.OS as 'ios' | 'android',
          manufacturer: Device.manufacturer || null,
          model: Device.modelName || null,
          os_version: Device.osVersion || null,
          app_name: 'operator',
          app_version: Constants.expoConfig?.version || null,
          has_gps: false,
          has_microphone: false,
          push_token: token,
          push_enabled: true,
          is_primary: true,
          is_active: true,
          first_seen_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          session_count: 1,
        });
    }

    logger.info('NOTIFY', 'Token saved to core_devices');
  } catch (error) {
    console.error('[push] Failed to save push token:', error);
  }
}

/**
 * Configure the notification handler for when the app is in foreground.
 */
export function configureForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}
