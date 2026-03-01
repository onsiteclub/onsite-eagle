import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import {
  fetchMessages,
  subscribeToMessages,
  groupMessagesByDate,
  PHASE_COLORS,
} from '@onsite/timeline';
import type { TimelineMessage } from '@onsite/timeline';
import { supabase } from '../lib/supabase';
import MessageBubble from './MessageBubble';
import DateDivider from './DateDivider';

const ACCENT = '#0F766E';

interface LotTimelineProps {
  siteId: string;
  houseId: string;
  currentPhase: number;
  currentUserId?: string;
}

type ListItem =
  | { type: 'message'; data: TimelineMessage }
  | { type: 'divider'; date: string; key: string };

export default function LotTimeline({
  siteId,
  houseId,
  currentPhase,
  currentUserId,
}: LotTimelineProps) {
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Fetch messages
  const loadMessages = useCallback(async () => {
    const { data, error } = await fetchMessages(supabase as never, {
      site_id: siteId,
      house_id: houseId,
      limit: 100,
    });

    if (error) {
      console.error('[LotTimeline] Fetch error:', error);
    }

    setMessages(data);
    setLoading(false);
  }, [siteId, houseId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToMessages(supabase as never, {
      site_id: siteId,
      house_id: houseId,
      onMessage: (msg: TimelineMessage) => {
        setMessages((prev) => [...prev, msg]);
        // Scroll to bottom on new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    });

    return unsubscribe;
  }, [siteId, houseId]);

  // Build flat data with date dividers for inverted FlatList
  const listData: ListItem[] = useMemo(() => {
    if (messages.length === 0) return [];

    const grouped = groupMessagesByDate(messages);
    const items: ListItem[] = [];

    // Messages come sorted ascending from fetchMessages.
    // FlatList inverted renders newest at bottom, so we reverse the data.
    const dateKeys = Object.keys(grouped);
    for (const dateKey of dateKeys) {
      items.push({ type: 'divider', date: dateKey, key: `div-${dateKey}` });
      for (const msg of grouped[dateKey]) {
        items.push({ type: 'message', data: msg });
      }
    }

    // Reverse for inverted FlatList (newest first in data = bottom in UI)
    return items.reverse();
  }, [messages]);

  const phaseColor = PHASE_COLORS[currentPhase] || PHASE_COLORS[1];

  function renderItem({ item }: { item: ListItem }) {
    if (item.type === 'divider') {
      return <DateDivider date={item.date} />;
    }
    return (
      <MessageBubble
        message={item.data}
        isCurrentUser={!!currentUserId && item.data.sender_id === currentUserId}
      />
    );
  }

  function keyExtractor(item: ListItem) {
    return item.type === 'divider' ? item.key : item.data.id;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: phaseColor.bg }]}>
      <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Send a message or take a photo to start the timeline.
            </Text>
          </View>
        }
      />
    </View>
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
    paddingVertical: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    // Inverted: needs transform to look correct
    transform: [{ scaleY: -1 }],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
  },
});
