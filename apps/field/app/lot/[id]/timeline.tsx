/**
 * Lot Timeline — WhatsApp-style message thread per house
 *
 * Uses @onsite/timeline: fetchMessages, sendMessage, subscribeToMessages.
 * Enterprise v3 light theme. source_app = 'field' (worker perspective).
 */

import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@onsite/auth';
import { fetchMessages, sendMessage, subscribeToMessages, formatMessageTime, SENDER_CONFIG } from '@onsite/timeline';
import type { TimelineMessage } from '@onsite/timeline';
import { supabase } from '../../../src/lib/supabase';

const ACCENT = '#0F766E';

export default function TimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [lotNumber, setLotNumber] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) loadHouseAndMessages();
  }, [id]);

  // Realtime subscription
  useEffect(() => {
    if (!siteId) return;

    const unsubscribe = subscribeToMessages(supabase as never, {
      site_id: siteId,
      house_id: id,
      onMessage: (msg) => {
        setMessages((prev) => [...prev, msg]);
      },
    });

    return unsubscribe;
  }, [siteId, id]);

  async function loadHouseAndMessages() {
    try {
      // Get lot to know jobsite_id
      const { data: house } = await supabase
        .from('frm_lots')
        .select('id, lot_number, jobsite_id')
        .eq('id', id)
        .single();

      if (!house) return;
      setSiteId(house.jobsite_id);
      setLotNumber(house.lot_number);

      // Fetch messages
      const { data, error } = await fetchMessages(supabase as never, {
        site_id: house.jobsite_id,
        house_id: id,
        limit: 100,
      });

      if (!error && data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !siteId || sending) return;

    setSending(true);
    setInputText('');

    try {
      await sendMessage(supabase as never, {
        site_id: siteId,
        house_id: id,
        sender_type: 'worker',
        sender_id: user?.id,
        sender_name: user?.email?.split('@')[0] || 'Worker',
        content: text,
        source_app: 'monitor', // closest valid SourceApp
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(text); // restore on failure
    } finally {
      setSending(false);
    }
  }, [inputText, siteId, id, user, sending]);

  const renderMessage = ({ item }: { item: TimelineMessage }) => {
    const isMe = item.sender_id === user?.id;
    const config = SENDER_CONFIG[item.sender_type] || SENDER_CONFIG.system;

    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
        {!isMe && (
          <View style={styles.senderRow}>
            <View style={[styles.senderDot, { backgroundColor: config.color }]} />
            <Text style={[styles.senderName, { color: config.color }]}>
              {item.sender_name}
            </Text>
            <Text style={styles.senderLabel}>{config.label}</Text>
          </View>
        )}
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
          {formatMessageTime(item.created_at)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Lot ${lotNumber} Timeline` }} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Messages Yet</Text>
              <Text style={styles.emptyText}>
                Send a message to start the conversation about this lot
              </Text>
            </View>
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  // Messages
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: ACCENT,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  senderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  senderLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  messageText: {
    fontSize: 15,
    color: '#101828',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F6F7F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#101828',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
