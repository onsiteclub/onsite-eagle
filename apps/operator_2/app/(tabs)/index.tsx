/**
 * Requests Screen — Operator 2 (Standalone Prototype)
 *
 * Two sub-tabs:
 *   Queue (default) — pending requests, click Delivered to move to archive
 *   Delivered — archived requests that were already fulfilled
 */

import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
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
  status: string;
  confidence: number | null;
  language_detected: string | null;
  delivered_at: string | null;
  worker_phone: string | null;
  worker_name: string | null;
  created_at: string;
  lot: { lot_number: string } | null;
}

type Tab = 'queue' | 'delivered';

export default function RequestsScreen() {
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('queue');

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
    () => requests.filter((r) => r.status !== 'delivered' && r.status !== 'cancelled'),
    [requests],
  );
  const deliveredItems = useMemo(
    () => requests.filter((r) => r.status === 'delivered'),
    [requests],
  );

  const displayedItems = activeTab === 'queue' ? queueItems : deliveredItems;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Requests</Text>
      </View>

      {/* Sub-tabs */}
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

      {/* Content */}
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : displayedItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {activeTab === 'queue' ? 'No pending requests' : 'No deliveries yet'}
          </Text>
          <Text style={styles.emptyHint}>
            {activeTab === 'queue'
              ? 'Send a WhatsApp or SMS to start receiving requests'
              : 'Delivered requests will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              onDeliver={handleDeliver}
              showDeliverButton={activeTab === 'queue'}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function RequestCard({
  request: req,
  onDeliver,
  showDeliverButton,
}: {
  request: IncomingRequest;
  onDeliver: (id: string) => void;
  showDeliverButton: boolean;
}) {
  const isDelivered = req.status === 'delivered';
  const isAmbiguous = req.source === 'ai_ambiguous';
  const materialLabel = [req.quantity, req.material_name].filter(Boolean).join(' x ');

  return (
    <View
      style={[
        styles.card,
        isAmbiguous && !isDelivered && styles.cardAmbiguous,
      ]}
    >
      <View style={styles.cardBody}>
        <Text style={[styles.lotText, isDelivered && styles.textMuted]}>
          {req.lot?.lot_number ? `LOT ${req.lot.lot_number}` : 'LOT ?'}
        </Text>
        {isAmbiguous && req.raw_message && !isDelivered ? (
          <Text style={styles.rawMessage}>"{req.raw_message}"</Text>
        ) : (
          <Text style={[styles.materialText, isDelivered && styles.textMuted]}>
            {materialLabel || req.raw_message || '—'}
          </Text>
        )}
        {req.worker_name && (
          <Text style={styles.workerText}>{req.worker_name}</Text>
        )}
      </View>

      <View style={styles.cardAction}>
        {isDelivered && req.delivered_at ? (
          <Text style={styles.deliveredTime}>
            {'\u2713'}{' '}
            {new Date(req.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : showDeliverButton ? (
          <Pressable style={styles.deliverBtn} onPress={() => onDeliver(req.id)}>
            <Text style={styles.deliverBtnText}>{'\u2713'} Delivered</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
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

  // Sub-tabs
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

  // List
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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

  // Cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 64,
  },
  cardAmbiguous: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberLine,
  },
  cardBody: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardAction: {
    alignItems: 'flex-end',
  },
  lotText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  materialText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rawMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.warning,
    marginTop: 2,
  },
  workerText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  textMuted: {
    color: colors.textSecondary,
  },
  deliverBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: borderRadius.sm,
  },
  deliverBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  deliveredTime: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
