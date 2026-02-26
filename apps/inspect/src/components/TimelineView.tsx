/**
 * Timeline/Chat view — AI-mediated timeline for a site.
 *
 * Uses @onsite/timeline for data operations.
 * WhatsApp-style inverted FlatList.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { format } from 'date-fns';
import { useAuth } from '@onsite/auth';
import { supabase } from '../lib/supabase';

const ACCENT = '#0F766E';

interface TimelineEvent {
  id: string;
  house_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface TimelineViewProps {
  siteId: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  note: '#3B82F6',
  photo: '#8B5CF6',
  alert: '#DC2626',
  ai_validation: '#0F766E',
  status_change: '#EA580C',
  issue: '#DC2626',
  inspection: '#7C3AED',
};

export default function TimelineView({ siteId }: TimelineViewProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('egl_timeline')
        .select('*')
        .eq('house_id', siteId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // If the site-level query doesn't work, try fetching all events for houses in this site
        const { data: houses } = await supabase
          .from('egl_houses')
          .select('id')
          .eq('site_id', siteId);

        if (houses && houses.length > 0) {
          const houseIds = houses.map((h: { id: string }) => h.id);
          const { data: evts } = await supabase
            .from('egl_timeline')
            .select('*')
            .in('house_id', houseIds)
            .order('created_at', { ascending: false })
            .limit(50);

          setEvents((evts as TimelineEvent[]) || []);
          return;
        }
      }

      setEvents((data as TimelineEvent[]) || []);
    } catch (err) {
      console.error('[timeline] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`timeline-${siteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'egl_timeline',
        },
        (payload) => {
          const newEvent = payload.new as TimelineEvent;
          setEvents((prev) => [newEvent, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteId]);

  async function handleSend() {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('egl_timeline').insert({
        house_id: null, // site-level message
        event_type: 'note',
        title: message.trim(),
        description: null,
        source: 'inspect',
        created_by: user?.id || null,
      });

      if (error) throw error;
      setMessage('');
    } catch (err) {
      console.error('[timeline] Send error:', err);
    } finally {
      setSending(false);
    }
  }

  function renderEvent({ item }: { item: TimelineEvent }) {
    const typeColor = EVENT_TYPE_COLORS[item.event_type] || '#6B7280';
    const time = format(new Date(item.created_at), 'MMM d, HH:mm');

    return (
      <View style={styles.eventCard}>
        <View style={[styles.eventDot, { backgroundColor: typeColor }]} />
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventType}>{item.event_type}</Text>
            <Text style={styles.eventTime}>{time}</Text>
          </View>
          <Text style={styles.eventTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.eventDescription}>{item.description}</Text>
          )}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <FlatList
        ref={flatListRef}
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No timeline events yet</Text>
          </View>
        }
      />

      {/* Message Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.messageInput}
          placeholder="Add a note..."
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#667085',
  },
  eventCard: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  eventContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  eventTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#101828',
  },
  eventDescription: {
    fontSize: 13,
    color: '#667085',
    marginTop: 4,
    lineHeight: 18,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#101828',
  },
  sendBtn: {
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
