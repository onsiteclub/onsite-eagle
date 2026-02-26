import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AuthProvider, useAuth } from '@onsite/auth';
import { initQueue, useOfflineSync } from '@onsite/offline';
import { supabase } from '../src/lib/supabase';

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

  // Navigation guard — redirect based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [loading, user, segments]);

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="lot/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="camera"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="scanner"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
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
