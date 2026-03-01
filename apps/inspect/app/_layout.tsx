import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AuthProvider, useAuth } from '@onsite/auth';
import { registerPushToken, configureForegroundHandler } from '../src/lib/pushRegistration';
import { initQueue, useOfflineSync } from '@onsite/offline';
import { logger } from '@onsite/logger';
import { supabase } from '../src/lib/supabase';

// Configure foreground notification display
configureForegroundHandler();

// Initialize offline queue with AsyncStorage
initQueue(AsyncStorage);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider supabase={supabase as never}>
        <StatusBar style="dark" />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pushRegistered = useRef(false);

  // Auto-sync offline queue when connectivity returns
  const { queueSize, isOnline } = useOfflineSync({
    supabase: supabase as never,
    netInfo: NetInfo,
    onFlush: (result) => {
      if (result.flushed > 0) {
        logger.info('SYNC', 'Flushed queued items', { flushed: result.flushed });
      }
    },
  });

  useEffect(() => {
    if (queueSize > 0) {
      logger.debug('SYNC', 'Offline queue status', { queueSize, isOnline });
    }
  }, [queueSize, isOnline]);

  // Navigation guard — redirect based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [loading, user, segments]);

  // Register push on login
  useEffect(() => {
    if (user && !pushRegistered.current) {
      pushRegistered.current = true;
      registerPushToken().catch(() => {});
    }
  }, [user]);

  // Handle notification taps
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (data?.type === 'inspection' && data?.house_id) {
        logger.info('INSPECTION', 'Tapped inspection notification', { houseId: data.house_id });
      }
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
});
