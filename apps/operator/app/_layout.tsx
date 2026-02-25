import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { registerPushToken, configureForegroundHandler } from '../src/lib/pushRegistration';
import { initQueue, useOfflineSync } from '@onsite/offline';
import { supabase } from '../src/lib/supabase';

// Configure foreground notification display
configureForegroundHandler();

// Initialize offline queue with AsyncStorage
initQueue(AsyncStorage);

export default function RootLayout() {
  const pushRegistered = useRef(false);

  // Auto-sync offline queue when connectivity returns
  const { queueSize, isOnline } = useOfflineSync({
    supabase: supabase as never,
    netInfo: NetInfo,
    onFlush: (result) => {
      if (result.flushed > 0) {
        console.log(`[offline] Flushed ${result.flushed} queued items`);
      }
    },
  });

  // Log connectivity status changes
  useEffect(() => {
    if (queueSize > 0) {
      console.log(`[offline] ${queueSize} items pending, online: ${isOnline}`);
    }
  }, [queueSize, isOnline]);

  // Register push token once user is authenticated
  useEffect(() => {
    if (pushRegistered.current) return;

    const checkAuthAndRegister = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        pushRegistered.current = true;
        registerPushToken().catch(() => {});
      }
    };

    checkAuthAndRegister();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !pushRegistered.current) {
        pushRegistered.current = true;
        registerPushToken().catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle notification taps
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (data?.type === 'material_request' && data?.request_id) {
        console.log('[push] Tapped material request notification:', data.request_id);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="requests/[id]"
          options={{
            headerShown: true,
            title: 'Detalhes do Pedido',
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#101828',
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
        <Stack.Screen
          name="deliver/[id]"
          options={{
            headerShown: true,
            title: 'Confirmar Entrega',
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#101828',
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
