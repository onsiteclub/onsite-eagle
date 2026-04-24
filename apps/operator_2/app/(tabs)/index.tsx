/**
 * Requests Screen — Operator 2
 *
 * Raw worker message is the protagonist. AI parse + translation live behind
 * the ✨ icon in a modal — opt-in, never cluttering the machinist's default
 * view.
 */

import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@onsite/tokens';
import { supabase } from '../../src/lib/supabase';

interface IncomingRequest {
  id: string;
  raw_message: string | null;
  source: string | null;
  material_name: string | null;
  quantity: number | null;
  notes: string | null;
  status: string;
  confidence: number | null;
  language_detected: string | null;
  delivered_at: string | null;
  worker_phone: string | null;
  worker_name: string | null;
  created_at: string;
  lot_text_hint: string | null;
  lot: { lot_number: string } | null;
}

type Tab = 'queue' | 'delivered';

const LANG_FLAGS: Record<string, string> = {
  en: '🇬🇧', pt: '🇵🇹', es: '🇪🇸', fr: '🇫🇷', tl: '🇵🇭',
  vi: '🇻🇳', zh: '🇨🇳', ar: '🇸🇦', hi: '🇮🇳', ru: '🇷🇺',
};

export default function RequestsScreen() {
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('queue');
  const [aiModalRequest, setAiModalRequest] = useState<IncomingRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('frm_material_requests')
        .select('*, lot:frm_lots!lot_id(lot_number)')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('requests-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'frm_material_requests',
      }, () => fetchRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  const handleDeliver = async (id: string) => {
    try {
      const { error } = await supabase
        .from('frm_material_requests')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      Alert.alert('Error', 'Failed to mark as delivered');
    }
  };

  const queueItems = useMemo(
    () => requests.filter(
      (r) => r.status !== 'delivered'
        && r.status !== 'cancelled'
        && r.status !== 'awaiting_info',
    ),
    [requests],
  );
  const deliveredItems = useMemo(
    () => requests.filter((r) => r.status === 'delivered'),
    [requests],
  );

  const displayedItems = activeTab === 'queue' ? queueItems : deliveredItems;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Requests</Text>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'queue' && styles.tabActive]}
          onPress={() => setActiveTab('queue')}
        >
          <Text style={[styles.tabText, activeTab === 'queue' && styles.tabTextActive]}>
            Queue
          </Text>
          {queueItems.length > 0 && (
            <View style={[styles.badge, activeTab === 'queue' && styles.badgeActive]}>
              <Text style={[styles.badgeText, activeTab === 'queue' && styles.badgeTextActive]}>
                {queueItems.length}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'delivered' && styles.tabActive]}
          onPress={() => setActiveTab('delivered')}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.tabTextActive]}>
            Delivered
          </Text>
          {deliveredItems.length > 0 && (
            <View style={[styles.badge, activeTab === 'delivered' && styles.badgeActive]}>
              <Text style={[styles.badgeText, activeTab === 'delivered' && styles.badgeTextActive]}>
                {deliveredItems.length}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            displayedItems.length === 0 ? styles.listEmpty : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {activeTab === 'queue' ? 'No pending requests' : 'No deliveries yet'}
              </Text>
              <Text style={styles.emptyHint}>
                {activeTab === 'queue'
                  ? 'Send a WhatsApp or SMS to start receiving requests\nPull down to refresh'
                  : 'Delivered requests will appear here'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              onDeliver={handleDeliver}
              onOpenAI={() => setAiModalRequest(item)}
              showDeliverButton={activeTab === 'queue'}
            />
          )}
        />
      )}

      <AIHelperModal
        request={aiModalRequest}
        onClose={() => setAiModalRequest(null)}
      />
    </SafeAreaView>
  );
}

function RequestCard({
  request: req,
  onDeliver,
  onOpenAI,
  showDeliverButton,
}: {
  request: IncomingRequest;
  onDeliver: (id: string) => void;
  onOpenAI: () => void;
  showDeliverButton: boolean;
}) {
  const isDelivered = req.status === 'delivered';
  const rawMessage = req.raw_message || '(empty message)';
  const flag = req.language_detected ? LANG_FLAGS[req.language_detected] : null;
  const timeLabel = new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Prefer the matched lot from frm_lots (verified); fall back to the AI's
  // raw extraction (unverified); show "?" only if truly missing.
  const lotLabel = req.lot?.lot_number ?? req.lot_text_hint ?? '?';
  const lotUnmatched = !req.lot?.lot_number && !!req.lot_text_hint;

  return (
    <View style={[styles.card, isDelivered && styles.cardDelivered]}>
      {/* Header: meta info (worker · time · lang) */}
      <Text style={styles.metaText} numberOfLines={1}>
        {req.worker_name || req.worker_phone || 'Unknown'}
        {'  ·  '}
        {timeLabel}
        {flag ? `  ·  ${flag}` : ''}
      </Text>

      {/* H1: LOT number */}
      <View style={styles.lotRow}>
        <Text style={[styles.lotTitle, isDelivered && styles.textMuted]}>
          LOT {lotLabel}
        </Text>
        {lotUnmatched ? (
          <Text style={styles.lotUnmatchedBadge}>unverified</Text>
        ) : null}
      </View>

      {/* H2: raw message in a responsive bubble */}
      <View style={styles.messageBubble}>
        <Text style={[styles.messageText, isDelivered && styles.textMuted]}>
          {rawMessage}
        </Text>
      </View>

      {/* Actions: translate (AI) + delivered */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onOpenAI}
          style={styles.iconBtn}
          hitSlop={8}
          accessibilityLabel="AI helper"
        >
          <Text style={styles.iconBtnText}>✨</Text>
        </Pressable>

        {isDelivered && req.delivered_at ? (
          <Text style={styles.deliveredTime}>
            {'✓'} Delivered{' '}
            {new Date(req.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : showDeliverButton ? (
          <Pressable
            style={styles.iconBtn}
            onPress={() => onDeliver(req.id)}
            hitSlop={8}
            accessibilityLabel="Mark delivered"
          >
            <Text style={styles.iconBtnText}>✓</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function AIHelperModal({
  request,
  onClose,
}: {
  request: IncomingRequest | null;
  onClose: () => void;
}) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  // Reset state when modal closes or switches to a different request
  useEffect(() => {
    setTranslation(null);
    setTranslating(false);
    setTranslateError(null);
  }, [request?.id]);

  if (!request) return null;

  const handleTranslate = async () => {
    if (!request.raw_message) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: { text: request.raw_message, target_lang: 'en' },
      });
      if (error) throw error;
      setTranslation(data?.translation || '(empty)');
    } catch (err) {
      console.error('Translate failed:', err);
      setTranslateError('Could not translate. Try again.');
    } finally {
      setTranslating(false);
    }
  };

  const lot = request.lot?.lot_number || '?';
  const material = request.material_name || '?';
  const qty = request.quantity != null ? String(request.quantity) : '?';
  const confidencePct = request.confidence != null
    ? `${Math.round(request.confidence * 100)}%`
    : 'n/a';
  const flag = request.language_detected ? LANG_FLAGS[request.language_detected] : '';

  return (
    <Modal
      visible={!!request}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>AI helper</Text>

          <Text style={styles.modalSectionLabel}>Original {flag}</Text>
          <Text style={styles.modalOriginal}>{request.raw_message || '(empty)'}</Text>

          <Text style={styles.modalSectionLabel}>Translation</Text>
          {translation ? (
            <Text style={styles.modalTranslation}>{translation}</Text>
          ) : translateError ? (
            <View>
              <Text style={styles.modalError}>{translateError}</Text>
              <Pressable style={styles.modalBtn} onPress={handleTranslate}>
                <Text style={styles.modalBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : translating ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.sm }} />
          ) : (
            <Pressable style={styles.modalBtn} onPress={handleTranslate}>
              <Text style={styles.modalBtnText}>🌐 Translate to English</Text>
            </Pressable>
          )}

          <Text style={styles.modalSectionLabel}>Parsed fields</Text>
          <View style={styles.parseGrid}>
            <View style={styles.parseRow}>
              <Text style={styles.parseKey}>Lot</Text>
              <Text style={styles.parseValue}>{lot}</Text>
            </View>
            <View style={styles.parseRow}>
              <Text style={styles.parseKey}>Material</Text>
              <Text style={styles.parseValue}>{material}</Text>
            </View>
            <View style={styles.parseRow}>
              <Text style={styles.parseKey}>Quantity</Text>
              <Text style={styles.parseValue}>{qty}</Text>
            </View>
            <View style={styles.parseRow}>
              <Text style={styles.parseKey}>Confidence</Text>
              <Text style={styles.parseValue}>{confidencePct}</Text>
            </View>
            {request.notes ? (
              <View style={styles.parseRow}>
                <Text style={styles.parseKey}>Notes</Text>
                <Text style={styles.parseValue}>{request.notes}</Text>
              </View>
            ) : null}
          </View>

          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    ...typography.screenTitle,
  },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full ?? 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.background,
  },
  badge: {
    backgroundColor: colors.border,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeActive: {
    backgroundColor: colors.background,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badgeTextActive: {
    color: colors.text,
  },

  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listEmpty: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  emptyText: {
    ...typography.cardTitle,
    marginBottom: spacing.xs,
  },
  emptyHint: {
    ...typography.meta,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  cardDelivered: {
    opacity: 0.6,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  lotRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lotTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  lotUnmatchedBadge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.warning,
    letterSpacing: 0.5,
  },
  messageBubble: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  textMuted: {
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  iconBtnText: {
    fontSize: 20,
    color: colors.text,
  },
  deliveredTime: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  modalOriginal: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  modalTranslation: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  modalError: {
    fontSize: 14,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  modalBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  parseGrid: {
    gap: spacing.xs,
  },
  parseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  parseKey: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  parseValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  modalClose: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.text,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background,
  },
});
