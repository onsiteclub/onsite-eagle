/**
 * Pedidos (Requests Queue) — Main screen
 *
 * Cards sorted by urgency with inline action buttons.
 * Operator lives here 95% of the time.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../src/lib/supabase';
import type { MaterialRequest, MaterialRequestStatus } from '@onsite/shared';
import { getOperatorQueue, updateRequestStatus } from '@onsite/shared';
import { formatDistanceToNow } from 'date-fns';

const ACCENT = '#0F766E';

const URGENCY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#F59E0B',
  medium: '#C58B1B',
  low: '#9CA3AF',
};

const STATUS_BORDER: Record<string, string> = {
  pending: '#DC2626',
  acknowledged: '#F59E0B',
  in_transit: '#0F766E',
  delivered: '#D1D5DB',
};

export default function RequestsQueue() {
  const router = useRouter();
  const { user } = useAuth();
  const operatorId = user?.id || null;
  const operatorName = user?.name?.split(' ')[0] || 'Operator';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const loadRequestsRef = useRef<() => void>();

  // Load assigned sites + initial requests when user is available
  useEffect(() => {
    if (operatorId) loadAssignments(operatorId);
    else setLoading(false);
  }, [operatorId]);

  // Load requests when screen gets focus
  useFocusEffect(
    useCallback(() => {
      if (operatorId) loadRequests();
    }, [operatorId])
  );

  // Realtime subscription — reload when material requests change
  useEffect(() => {
    if (siteIds.length === 0) return;

    const channelConfig = siteIds.length === 1
      ? { event: '*' as const, schema: 'public', table: 'frm_material_requests', filter: `jobsite_id=eq.${siteIds[0]}` }
      : { event: '*' as const, schema: 'public', table: 'frm_material_requests' };

    const channel = supabase
      .channel('operator-requests')
      .on('postgres_changes', channelConfig, (payload) => {
        // Multi-site: check if change belongs to our sites
        if (siteIds.length > 1) {
          const siteId = (payload.new as any)?.jobsite_id || (payload.old as any)?.jobsite_id;
          if (siteId && !siteIds.includes(siteId)) return;
        }
        loadRequestsRef.current?.();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteIds]);

  async function loadAssignments(userId: string) {
    // Load assigned site IDs for realtime filter
    const { data: assignments } = await supabase
      .from('frm_operator_assignments')
      .select('jobsite_id')
      .eq('operator_id', userId)
      .eq('is_active', true);

    if (assignments && assignments.length > 0) {
      setSiteIds(assignments.map((a: any) => a.jobsite_id));
    }

    // Initial load
    await loadRequestsForOperator(userId);
  }

  async function loadRequestsForOperator(opId: string) {
    try {
      const { data, error } = await getOperatorQueue(supabase, opId);

      if (error) {
        console.error('Error loading requests:', error);
        return;
      }

      processRequests(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadRequests() {
    if (!operatorId) return;
    await loadRequestsForOperator(operatorId);
  }

  // Keep ref updated for realtime callback
  loadRequestsRef.current = loadRequests;

  function processRequests(data: MaterialRequest[] | null) {
    const activeStatuses = ['pending', 'acknowledged', 'in_transit'];
    const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const statusOrder: Record<string, number> = { pending: 0, acknowledged: 1, in_transit: 2 };

    const active = (data || [])
      .filter(req => activeStatuses.includes(req.status))
      .map(req => ({
        ...req,
        lot_number: (req as any).house?.lot_number || null,
        site_name: (req as any).site?.name || null,
      }))
      .sort((a, b) => {
        const urgA = urgencyOrder[a.urgency_level] ?? 99;
        const urgB = urgencyOrder[b.urgency_level] ?? 99;
        if (urgA !== urgB) return urgA - urgB;
        const stA = statusOrder[a.status] ?? 99;
        const stB = statusOrder[b.status] ?? 99;
        if (stA !== stB) return stA - stB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    setRequests(active);
  }

  async function handleInTransit(item: MaterialRequest) {
    setUpdatingId(item.id);
    try {
      const { error } = await updateRequestStatus(supabase, item.id, {
        status: 'in_transit' as MaterialRequestStatus,
      });
      if (error) {
        Alert.alert('Error', 'Failed to update status');
      } else {
        loadRequests();
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setUpdatingId(null);
    }
  }

  function handleDelivered(item: MaterialRequest) {
    router.push(`/deliver/${item.id}`);
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const renderCard = ({ item }: { item: MaterialRequest }) => {
    const borderColor = STATUS_BORDER[item.status] || '#D1D5DB';
    const isUpdating = updatingId === item.id;
    const isPending = item.status === 'pending' || item.status === 'acknowledged';
    const isInTransit = item.status === 'in_transit';

    return (
      <View style={[styles.card, { borderLeftColor: borderColor }]}>
        {/* Card Content */}
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => router.push(`/requests/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={[
              styles.urgencyDot,
              { backgroundColor: URGENCY_COLORS[item.urgency_level] || '#9CA3AF' }
            ]} />
            <Text style={styles.materialName} numberOfLines={1}>
              {item.material_name}
              {item.quantity ? ` x${item.quantity}` : ''}
            </Text>
            {item.lot_number && (
              <Text style={styles.lotBadge}>Lot {item.lot_number}</Text>
            )}
          </View>

          <Text style={styles.metaText} numberOfLines={1}>
            {item.site_name || 'Site'}
            {' · '}
            {item.requested_by_name}
            {' · '}
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isPending && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.transitBtn]}
              onPress={() => handleInTransit(item)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="car" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>In Transit</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.deliveredBtn]}
            onPress={() => handleDelivered(item)}
            disabled={isUpdating}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Delivered</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Requests</Text>
          <Text style={styles.headerSubtitle}>
            {requests.length} active
          </Text>
        </View>
        <View style={styles.syncBadge}>
          <Ionicons name="radio" size={14} color={ACCENT} />
          <Text style={styles.syncText}>Live</Text>
        </View>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No active requests</Text>
            <Text style={styles.emptySubtitle}>Pull to refresh</Text>
          </View>
        }
      />

      {/* Camera FAB */}
      <TouchableOpacity
        style={styles.cameraFab}
        onPress={() => router.push('/photo')}
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={26} color="#fff" />
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#101828',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncText: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    padding: 14,
    paddingBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  urgencyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
    flex: 1,
  },
  lotBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  transitBtn: {
    backgroundColor: '#0F766E',
  },
  deliveredBtn: {
    backgroundColor: '#16A34A',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  cameraFab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
});
