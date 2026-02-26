/**
 * Push notification registration for Inspect app.
 *
 * Gets an Expo Push Token and saves it to core_devices.
 * Uses Expo Push Notifications service (handles FCM/APNs under the hood).
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Register for push notifications and save the token to core_devices.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[push] Skipping push registration on emulator/simulator');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F766E',
    });

    await Notifications.setNotificationChannelAsync('inspections', {
      name: 'Inspections',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B30',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[push] No EAS project ID found — push token registration skipped');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log('[push] Expo push token:', token);
    await savePushToken(token);
    return token;
  } catch (error) {
    console.error('[push] Failed to get push token:', error);
    return null;
  }
}

async function savePushToken(token: string): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const userId = authData.user.id;

    const { data: existing } = await supabase
      .from('core_devices')
      .select('id')
      .eq('user_id', userId)
      .eq('app_name', 'inspect')
      .maybeSingle();

    if (existing) {
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
      await supabase
        .from('core_devices')
        .insert({
          user_id: userId,
          device_id: `inspect-${Date.now()}`,
          device_name: Device.deviceName || null,
          platform: Platform.OS as 'ios' | 'android',
          manufacturer: Device.manufacturer || null,
          model: Device.modelName || null,
          os_version: Device.osVersion || null,
          app_name: 'inspect',
          app_version: Constants.expoConfig?.version || null,
          has_gps: true,
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

    console.log('[push] Token saved to core_devices');
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
