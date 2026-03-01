/**
 * Lot Detail — Timeline-centric workspace for a single lot.
 *
 * Layout: LotHeader (~8%) + LotTimeline (~72%) + ActionBar (~20%)
 * All data is scoped to this house_id.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@onsite/auth';
import { sendMessage, requestMediation } from '@onsite/timeline';
import type { TimelineEventType } from '@onsite/timeline';
import { supabase } from '../../../src/lib/supabase';
import LotHeader from '../../../src/components/LotHeader';
import LotTimeline from '../../../src/components/LotTimeline';
import ActionBar from '../../../src/components/ActionBar';
import EventTypePicker from '../../../src/components/EventTypePicker';
import type { House } from '@onsite/shared';

const ACCENT = '#0F766E';
const MONITOR_API_URL = process.env.EXPO_PUBLIC_MONITOR_API_URL || 'https://monitor.onsiteclub.ca';

export default function LotDetailScreen() {
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [eventPickerVisible, setEventPickerVisible] = useState(false);

  const fetchHouse = useCallback(async () => {
    if (!lotId) return;
    try {
      const { data, error } = await supabase
        .from('frm_lots')
        .select('*')
        .eq('id', lotId)
        .single();

      if (error) throw error;
      setHouse(data as House);
    } catch (err) {
      console.error('[lot] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    fetchHouse();
  }, [fetchHouse]);

  // Send a text message to the lot timeline
  async function handleSendMessage(text: string) {
    if (!house || sending) return;
    setSending(true);
    try {
      const { error } = await sendMessage(supabase as never, {
        site_id: house.jobsite_id,
        house_id: house.id,
        sender_type: 'supervisor',
        sender_id: user?.id,
        sender_name: user?.email || 'Inspector',
        content: text,
        phase_at_creation: house.current_phase || 1,
        source_app: 'inspect',
      });

      if (error) {
        console.error('[lot] Send error:', error);
        return;
      }

      // AI mediation (fire-and-forget)
      requestMediation(MONITOR_API_URL, {
        message: text,
        site_id: house.jobsite_id,
        house_id: house.id,
        sender_type: 'supervisor',
        sender_id: user?.id,
        sender_name: user?.email || 'Inspector',
        source_app: 'inspect',
      }).catch(() => {
        // Non-fatal: message stays as 'note'
      });
    } finally {
      setSending(false);
    }
  }

  // Navigate to camera
  function handleCameraPress() {
    if (!house) return;
    router.push({
      pathname: '/(app)/camera',
      params: {
        houseId: house.id,
        siteId: house.jobsite_id,
        currentPhase: String(house.current_phase || 1),
      },
    });
  }

  // Open event type picker
  function handleEventPress() {
    setEventPickerVisible(true);
  }

  // Send a typed event from the picker
  async function handleEventSelect(eventType: TimelineEventType, label: string) {
    setEventPickerVisible(false);
    if (!house) return;

    setSending(true);
    try {
      await sendMessage(supabase as never, {
        site_id: house.jobsite_id,
        house_id: house.id,
        sender_type: 'supervisor',
        sender_id: user?.id,
        sender_name: user?.email || 'Inspector',
        content: `[${label}]`,
        phase_at_creation: house.current_phase || 1,
        source_app: 'inspect',
      });
    } catch (err) {
      console.error('[lot] Event send error:', err);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!house) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Lot not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header ~8% */}
      <LotHeader house={house} onBackPress={() => router.back()} />

      {/* Timeline ~72% */}
      <LotTimeline
        siteId={house.jobsite_id}
        houseId={house.id}
        currentPhase={house.current_phase || 1}
        currentUserId={user?.id}
      />

      {/* Action Bar ~20% */}
      <ActionBar
        onSendMessage={handleSendMessage}
        onCameraPress={handleCameraPress}
        onEventPress={handleEventPress}
        sending={sending}
      />

      {/* Event Type Picker Modal */}
      <EventTypePicker
        visible={eventPickerVisible}
        onClose={() => setEventPickerVisible(false)}
        onSelect={handleEventSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
});
