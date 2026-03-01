/**
 * My Lots — Worker's assigned lots
 *
 * Sprint 2: Filters lots by crew assignment (worker sees only their crew's lots).
 * Uses new LotStatus values and PhaseId text labels.
 * Enterprise v3 light theme.
 */

import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../src/lib/supabase';
import { FRAMING_PHASES } from '@onsite/framing';

interface House {
  id: string;
  lot_number: string;
  address: string | null;
  status: string;
  current_phase: string | null;
  jobsite_id: string;
  jobsite: {
    id: string;
    name: string;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#6B7280',
  released: '#3B82F6',
  in_progress: '#F59E0B',
  paused_for_trades: '#8B5CF6',
  backframe: '#06B6D4',
  inspection: '#EF4444',
  completed: '#10B981',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  released: 'Released',
  in_progress: 'In Progress',
  paused_for_trades: 'Trades',
  backframe: 'Backframe',
  inspection: 'Inspection',
  completed: 'Completed',
};

const ACCENT = '#0F766E';

export default function MyLotsScreen() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) loadHouses();
  }, [user]);

  async function loadHouses() {
    try {
      if (!user) return;

      // 1. Find crews this worker belongs to
      const { data: crewMemberships } = await supabase
        .from('frm_crew_workers')
        .select('crew_id')
        .eq('worker_id', user.id)
        .is('left_at', null);

      const crewIds = (crewMemberships || []).map(m => m.crew_id);

      if (crewIds.length === 0) {
        // Fallback: load all lots the user has access to via org membership
        const { data, error } = await supabase
          .from('frm_lots')
          .select(`
            id, lot_number, address, status, current_phase, jobsite_id,
            jobsite:frm_jobsites(id, name)
          `)
          .order('lot_number', { ascending: true });

        if (!error && data) {
          setHouses(normalizeData(data));
        }
        setLoading(false);
        return;
      }

      // 2. Find lots assigned to worker's crews
      const { data: assignments } = await supabase
        .from('frm_phase_assignments')
        .select('lot_id')
        .in('crew_id', crewIds)
        .neq('status', 'cancelled');

      const lotIds = [...new Set((assignments || []).map(a => a.lot_id))];

      if (lotIds.length === 0) {
        setHouses([]);
        setLoading(false);
        return;
      }

      // 3. Load lot details
      const { data, error } = await supabase
        .from('frm_lots')
        .select(`
          id, lot_number, address, status, current_phase, jobsite_id,
          jobsite:frm_jobsites(id, name)
        `)
        .in('id', lotIds)
        .order('lot_number', { ascending: true });

      if (error) {
        console.error('Error loading houses:', error);
        setHouses([]);
        return;
      }

      setHouses(normalizeData(data || []));
    } catch (error) {
      console.error('Error loading houses:', error);
      setHouses([]);
    } finally {
      setLoading(false);
    }
  }

  function normalizeData(data: any[]): House[] {
    return data.map((h: any) => ({
      ...h,
      jobsite: Array.isArray(h.jobsite) ? h.jobsite[0] : h.jobsite,
    }));
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHouses();
    setRefreshing(false);
  }, [user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading your lots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Lots</Text>
        <Text style={styles.headerSubtitle}>
          {houses.length} lot{houses.length !== 1 ? 's' : ''} assigned
        </Text>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{houses.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
            {houses.filter(h => h.status === 'in_progress').length}
          </Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {houses.filter(h => h.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Lot List */}
      <FlatList
        data={houses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
          const phaseName = item.current_phase
            ? FRAMING_PHASES.find(p => p.id === item.current_phase)?.name || item.current_phase
            : 'Not Started';

          return (
            <TouchableOpacity
              style={styles.lotCard}
              onPress={() => router.push(`/lot/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.lotHeader}>
                <View style={styles.lotTitleRow}>
                  <Text style={styles.lotNumber}>Lot {item.lot_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>
                      {STATUS_LABELS[item.status] || item.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.siteName}>{item.jobsite?.name || 'Unknown Site'}</Text>
                {item.address && (
                  <Text style={styles.address}>{item.address}</Text>
                )}
              </View>

              {/* Phase info */}
              <View style={styles.phaseSection}>
                <Text style={styles.phaseText}>
                  Phase: {phaseName}
                </Text>
              </View>

              <View style={styles.lotFooter}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Lots Assigned</Text>
            <Text style={styles.emptyText}>
              Scan a site QR code in Settings to connect to your construction site
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => router.push('/scanner')}
            >
              <Ionicons name="qr-code" size={20} color="#FFFFFF" />
              <Text style={styles.scanButtonText}>Scan QR Code</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
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
  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
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
    marginTop: 4,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#101828',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  lotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  lotHeader: {
    marginBottom: 12,
  },
  lotTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lotNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  siteName: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '500',
    marginTop: 4,
  },
  address: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  // Phase
  phaseSection: {
    marginBottom: 8,
  },
  phaseText: {
    fontSize: 13,
    color: '#667085',
  },
  lotFooter: {
    alignItems: 'flex-end',
  },
  // Empty state
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
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
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
