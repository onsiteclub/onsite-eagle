import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AuthProvider, useAuth } from '@onsite/auth';
import { useActiveWarnings } from '@onsite/framing';
import { initQueue, useOfflineSync } from '@onsite/offline';
import { logger } from '@onsite/logger';
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

function WarningBanners() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    if (user) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setUserId(data.user.id);
      });
    } else {
      setUserId(undefined);
    }
  }, [user]);

  const {
    safetyWarnings,
    complianceWarnings,
    operationalWarnings,
    dismissWarning,
  } = useActiveWarnings({
    supabase: supabase as never,
    workerId: userId,
  });

  const hasWarnings =
    safetyWarnings.length > 0 ||
    complianceWarnings.length > 0 ||
    operationalWarnings.length > 0;

  if (!hasWarnings) return null;

  return (
    <View>
      {safetyWarnings.map((w) => (
        <View key={w.id} style={bannerStyles.safety}>
          <Text style={bannerStyles.safetyIcon}>{'\u{1F6E1}'}</Text>
          <Text style={bannerStyles.safetyText}>{w.title}</Text>
        </View>
      ))}
      {complianceWarnings.map((w) => (
        <View key={w.id} style={bannerStyles.compliance}>
          <Text style={bannerStyles.complianceIcon}>{'\u26A0'}</Text>
          <Text style={bannerStyles.complianceText}>{w.title}</Text>
        </View>
      ))}
      {operationalWarnings.map((w) => (
        <View key={w.id} style={bannerStyles.operational}>
          <Text style={bannerStyles.operationalIcon}>{'\u2139'}</Text>
          <Text style={bannerStyles.operationalText}>{w.title}</Text>
          <TouchableOpacity onPress={() => dismissWarning(w.id)}>
            <Text style={bannerStyles.dismissBtn}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
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
        logger.info('SYNC', 'Flushed queued items', { flushed: result.flushed });
      }
    },
  });

  // Log connectivity status changes
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
    <View style={{ flex: 1 }}>
      <WarningBanners />
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
    </View>
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

const bannerStyles = StyleSheet.create({
  safety: {
    backgroundColor: '#DC2626',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  safetyText: {
    color: '#FFFFFF',
    flex: 1,
    fontWeight: '600',
    fontSize: 14,
  },
  compliance: {
    backgroundColor: '#F59E0B',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  complianceIcon: {
    color: '#1F2937',
    fontSize: 16,
    marginRight: 8,
  },
  complianceText: {
    color: '#1F2937',
    flex: 1,
    fontWeight: '600',
    fontSize: 14,
  },
  operational: {
    backgroundColor: '#3B82F6',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  operationalIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  operationalText: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 14,
  },
  dismissBtn: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    paddingLeft: 12,
    fontSize: 16,
  },
});
