import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@onsite/tokens';
import type { TimelineMessage } from '@onsite/timeline';
import { fetchMessages, sendMessage, subscribeToMessages } from '@onsite/timeline/data';
import { enqueue } from '@onsite/offline/queue';
import { supabase } from '../../lib/supabase';
import { DateDivider } from './DateDivider';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

interface DecoratedItem {
  key: string;
  kind: 'date' | 'message';
  message?: TimelineMessage;
  date?: string;
}

async function resolveWorkerContext() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { userId: null, senderName: 'Worker', siteId: null };

  const { data: profile } = await supabase
    .from('core_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data: link } = await supabase
    .from('frm_site_workers')
    .select('jobsite_id')
    .eq('worker_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  return {
    userId: user.id,
    senderName: profile?.full_name || user.email || 'Worker',
    siteId: link?.jobsite_id || null,
  };
}

export function TimelineFeed() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [senderName, setSenderName] = useState('Worker');

  const loadContextAndMessages = useCallback(async () => {
    setLoading(true);

    const context = await resolveWorkerContext();
    setSiteId(context.siteId);
    setUserId(context.userId);
    setSenderName(context.senderName);

    if (!context.siteId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const result = await fetchMessages(supabase as never, {
      site_id: context.siteId,
      limit: 150,
    });
    setMessages((result.data || []).slice().reverse());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadContextAndMessages();
  }, [loadContextAndMessages]);

  useEffect(() => {
    if (!siteId) return undefined;

    const unsubscribe = subscribeToMessages(
      supabase as never,
      {
        site_id: siteId,
        onMessage: (newMessage: TimelineMessage) => {
          setMessages((prev) => [newMessage, ...prev]);
        },
      },
    );

    return unsubscribe;
  }, [siteId]);

  const decorated = useMemo<DecoratedItem[]>(() => {
    const items: DecoratedItem[] = [];
    let previousDate: string | null = null;

    for (const msg of messages) {
      const dateKey = new Date(msg.created_at).toDateString();
      if (dateKey !== previousDate) {
        items.push({ key: `d-${dateKey}`, kind: 'date', date: msg.created_at });
        previousDate = dateKey;
      }
      items.push({ key: `m-${msg.id}`, kind: 'message', message: msg });
    }

    return items;
  }, [messages]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!siteId) return;
      setSending(true);

      const result = await sendMessage(supabase as never, {
        site_id: siteId,
        sender_type: 'worker',
        sender_id: userId || undefined,
        sender_name: senderName,
        content,
        source_app: 'timekeeper',
      });

      // Offline fallback: queue message for later sync
      if (result.error) {
        await enqueue({
          table: 'frm_messages',
          operation: 'INSERT',
          data: {
            site_id: siteId,
            sender_type: 'worker',
            sender_id: userId || null,
            sender_name: senderName,
            content,
            source_app: 'timekeeper',
            house_id: null,
            attachments: [],
            is_ai_response: false,
            ai_question: null,
            phase_at_creation: 1,
          },
        }).catch(() => {});
      }

      setSending(false);
    },
    [siteId, userId, senderName],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.subtitle}>Site events and updates</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : !siteId ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No site assigned</Text>
          <Text style={styles.emptyText}>
            Link this worker to a jobsite in Monitor to enable timeline updates.
          </Text>
        </View>
      ) : (
        <FlatList
          data={decorated}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.kind === 'date' && item.date) return <DateDivider date={item.date} />;
            if (!item.message) return null;
            const isOwn = !!userId && item.message.sender_id === userId;
            return <MessageBubble message={item.message} isOwn={isOwn} />;
          }}
          inverted
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <MessageInput disabled={!siteId} sending={sending} onSend={handleSend} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: 8,
  },
});
