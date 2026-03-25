/**
 * Pedidos (Requests Queue) — Main screen
 *
 * Toggle between Material and Equipment requests.
 * Cards sorted by urgency/priority with inline action buttons.
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
import type { FrmEquipmentRequest } from '@onsite/framing';
import {
  getEquipmentQueue,
  acceptEquipmentRequest,
  completeEquipmentRequest,
  EQUIPMENT_TYPES,
} from '@onsite/framing';
import { formatDistanceToNow } from 'date-fns';

const ACCENT = '#0F766E';

type QueueTab = 'materials' | 'equipment';

const URGENCY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#F59E0B',
  medium: '#C58B1B',
  low: '#9CA3AF',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#DC2626',
  high: '#F59E0B',
  normal: '#0F766E',
  low: '#9CA3AF',
};

const STATUS_BORDER: Record<string, string> = {
  // Material statuses
  pending: '#DC2626',
  acknowledged: '#F59E0B',
  in_transit: '#0F766E',
  delivered: '#D1D5DB',
  // Equipment statuses
  requested: '#DC2626',
  accepted: '#F59E0B',
  scheduled: '#3B82F6',
  in_progress: '#0F766E',
  completed: '#D1D5DB',
};

/** Enriched equipment request with joined lot/phase data */
type EquipmentItem = FrmEquipmentRequest & {
  lot: { id: string; lot_number: string; address: string | null; jobsite_id: string; jobsite: { id: string; name: string } | null } | null;
  phase: { id: string; name: string } | null;
};

function getEquipmentLabel(code: string): string {
  const match = EQUIPMENT_TYPES.find(t => t.code === code);
  return match ? match.label : code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function RequestsQueue() {
  const router = useRouter();
  const { user } = useAuth();
  const operatorId = user?.id || null;
  const operatorName = user?.name?.split(' ')[0] || 'Operator';

  // Tab state
  const [activeTab, setActiveTab] = useState<QueueTab>('materials');

  // Material state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const loadRequestsRef = useRef<() => void>();

  // Equipment state
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentRequests, setEquipmentRequests] = useState<EquipmentItem[]>([]);
  const [equipmentUpdatingId, setEquipmentUpdatingId] = useState<string | null>(null);
  const loadEquipmentRef = useRef<() => void>();

  // Load assigned sites + initial data when user is available
  useEffect(() => {
    if (operatorId) loadAssignments(operatorId);
    else {
      setLoading(false);
      setEquipmentLoading(false);
    }
  }, [operatorId]);

  // Reload when screen gets focus
  useFocusEffect(
    useCallback(() => {
      if (operatorId) {
        loadRequests();
        loadEquipment();
      }
    }, [operatorId])
  );

  // Realtime subscription — material requests
  useEffect(() => {
    if (siteIds.length === 0) return;

    const channelConfig = siteIds.length === 1
      ? { event: '*' as const, schema: 'public', table: 'frm_material_requests', filter: `jobsite_id=eq.${siteIds[0]}` }
      : { event: '*' as const, schema: 'public', table: 'frm_material_requests' };

    const channel = supabase
      .channel('operator-material-requests')
      .on('postgres_changes', channelConfig, (payload) => {
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

  // Realtime subscription — equipment requests
  useEffect(() => {
    if (siteIds.length === 0) return;

    const channel = supabase
      .channel('operator-equipment-requests')
      .on('postgres_changes', {
        event: '*' as const,
        schema: 'public',
        table: 'frm_equipment_requests',
      }, () => {
        loadEquipmentRef.current?.();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteIds]);

  async function loadAssignments(userId: string) {
    const { data: assignments } = await supabase
      .from('frm_operator_assignments')
      .select('jobsite_id')
      .eq('operator_id', userId)
      .eq('is_active', true);

    if (assignments && assignments.length > 0) {
      setSiteIds(assignments.map((a: any) => a.jobsite_id));
    }

    // Initial load — both queues in parallel
    await Promise.all([
      loadMaterialsForOperator(userId),
      loadEquipmentForOperator(userId),
    ]);
  }

  // --- Material loading ---

  async function loadMaterialsForOperator(opId: string) {
    try {
      const { data, error } = await getOperatorQueue(supabase, opId);
      if (error) {
        console.error('Error loading material requests:', error);
        return;
      }
      processMaterialRequests(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadRequests() {
    if (!operatorId) return;
    await loadMaterialsForOperator(operatorId);
  }

  loadRequestsRef.current = loadRequests;

  function processMaterialRequests(data: MaterialRequest[] | null) {
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

  // --- Equipment loading ---

  async function loadEquipmentForOperator(opId: string) {
    try {
      const data = await getEquipmentQueue(supabase, opId);
      processEquipmentRequests(data);
    } catch (err) {
      console.error('Error loading equipment requests:', err);
    } finally {
      setEquipmentLoading(false);
      setRefreshing(false);
    }
  }

  async function loadEquipment() {
    if (!operatorId) return;
    await loadEquipmentForOperator(operatorId);
  }

  loadEquipmentRef.current = loadEquipment;

  function processEquipmentRequests(data: EquipmentItem[] | null) {
    const activeStatuses = ['requested', 'accepted', 'scheduled', 'in_progress'];
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    const statusOrder: Record<string, number> = { requested: 0, accepted: 1, scheduled: 2, in_progress: 3 };

    const active = (data || [])
      .filter(req => activeStatuses.includes(req.status))
      .sort((a, b) => {
        const priA = priorityOrder[a.priority] ?? 99;
        const priB = priorityOrder[b.priority] ?? 99;
        if (priA !== priB) return priA - priB;
        const stA = statusOrder[a.status] ?? 99;
        const stB = statusOrder[b.status] ?? 99;
        if (stA !== stB) return stA - stB;
        return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
      });

    setEquipmentRequests(active);
  }

  // --- Material actions ---

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

  // --- Equipment actions ---

  async function handleAcceptEquipment(item: EquipmentItem) {
    if (!operatorId) return;
    setEquipmentUpdatingId(item.id);
    try {
      await acceptEquipmentRequest(supabase, item.id, operatorId);
      loadEquipment();
    } catch (err) {
      console.error('Error accepting equipment request:', err);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setEquipmentUpdatingId(null);
    }
  }

  async function handleCompleteEquipment(item: EquipmentItem) {
    setEquipmentUpdatingId(item.id);
    try {
      await completeEquipmentRequest(supabase, item.id);
      loadEquipment();
    } catch (err) {
      console.error('Error completing equipment request:', err);
      Alert.alert('Error', 'Failed to complete request');
    } finally {
      setEquipmentUpdatingId(null);
    }
  }

  // --- Refresh ---

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'materials') {
      loadRequests();
    } else {
      loadEquipment();
    }
  };

  // --- Material card ---

  const renderMaterialCard = ({ item }: { item: MaterialRequest }) => {
    const borderColor = STATUS_BORDER[item.status] || '#D1D5DB';
    const isUpdating = updatingId === item.id;
    const isPending = item.status === 'pending' || item.status === 'acknowledged';

    return (
      <View style={[styles.card, { borderLeftColor: borderColor }]}>
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
            <Text style={styles.itemName} numberOfLines={1}>
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

  // --- Equipment card ---

  const renderEquipmentCard = ({ item }: { item: EquipmentItem }) => {
    const borderColor = STATUS_BORDER[item.status] || '#D1D5DB';
    const isUpdating = equipmentUpdatingId === item.id;
    const isRequested = item.status === 'requested';
    const canComplete = item.status === 'accepted' || item.status === 'scheduled' || item.status === 'in_progress';
    const lotNumber = item.lot?.lot_number || null;
    const siteName = item.lot?.jobsite?.name || null;
    const phaseName = item.phase?.name || null;

    return (
      <View style={[styles.card, { borderLeftColor: borderColor }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[
              styles.urgencyDot,
              { backgroundColor: PRIORITY_COLORS[item.priority] || '#9CA3AF' }
            ]} />
            <Ionicons name="construct" size={16} color="#6B7280" style={{ marginRight: -4 }} />
            <Text style={styles.itemName} numberOfLines={1}>
              {getEquipmentLabel(item.operation_type)}
            </Text>
            {lotNumber && (
              <Text style={styles.lotBadge}>Lot {lotNumber}</Text>
            )}
          </View>

          {item.description ? (
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <Text style={styles.metaText} numberOfLines={1}>
            {siteName || 'Site'}
            {phaseName ? ` · ${phaseName}` : ''}
            {' · '}
            {item.priority}
            {' · '}
            {formatDistanceToNow(new Date(item.requested_at), { addSuffix: true })}
          </Text>

          {item.status !== 'requested' && (
            <View style={styles.statusRow}>
              <View style={[styles.statusChip, { backgroundColor: `${STATUS_BORDER[item.status]}18` }]}>
                <Text style={[styles.statusChipText, { color: STATUS_BORDER[item.status] }]}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
              {item.scheduled_at && (
                <Text style={styles.scheduledText}>
                  Scheduled {formatDistanceToNow(new Date(item.scheduled_at), { addSuffix: true })}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {isRequested && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleAcceptEquipment(item)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="hand-left" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canComplete && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => handleCompleteEquipment(item)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Complete</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // --- Main render ---

  const isCurrentTabLoading = activeTab === 'materials' ? loading : equipmentLoading;
  const currentData = activeTab === 'materials' ? requests : equipmentRequests;
  const totalActive = requests.length + equipmentRequests.length;

  if (loading && equipmentLoading) {
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
            {totalActive} active
          </Text>
        </View>
        <View style={styles.syncBadge}>
          <Ionicons name="radio" size={14} color={ACCENT} />
          <Text style={styles.syncText}>Live</Text>
        </View>
      </View>

      {/* Tab Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'materials' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('materials')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="cube"
            size={16}
            color={activeTab === 'materials' ? '#fff' : '#6B7280'}
          />
          <Text style={[styles.toggleText, activeTab === 'materials' && styles.toggleTextActive]}>
            Materials
          </Text>
          {requests.length > 0 && (
            <View style={[styles.toggleCount, activeTab === 'materials' && styles.toggleCountActive]}>
              <Text style={[styles.toggleCountText, activeTab === 'materials' && styles.toggleCountTextActive]}>
                {requests.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'equipment' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('equipment')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="construct"
            size={16}
            color={activeTab === 'equipment' ? '#fff' : '#6B7280'}
          />
          <Text style={[styles.toggleText, activeTab === 'equipment' && styles.toggleTextActive]}>
            Equipment
          </Text>
          {equipmentRequests.length > 0 && (
            <View style={[styles.toggleCount, activeTab === 'equipment' && styles.toggleCountActive]}>
              <Text style={[styles.toggleCountText, activeTab === 'equipment' && styles.toggleCountTextActive]}>
                {equipmentRequests.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* List */}
      {isCurrentTabLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : activeTab === 'materials' ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderMaterialCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No material requests</Text>
              <Text style={styles.emptySubtitle}>Pull to refresh</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={equipmentRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderEquipmentCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No equipment requests</Text>
              <Text style={styles.emptySubtitle}>Pull to refresh</Text>
            </View>
          }
        />
      )}

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

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  toggleBtnActive: {
    backgroundColor: ACCENT,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  toggleCount: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  toggleCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  toggleCountTextActive: {
    color: '#FFFFFF',
  },

  // List
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
  itemName: {
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
  descriptionText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 18,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 18,
    marginTop: 6,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  scheduledText: {
    fontSize: 12,
    color: '#6B7280',
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
  acceptBtn: {
    backgroundColor: '#0F766E',
  },
  completeBtn: {
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
