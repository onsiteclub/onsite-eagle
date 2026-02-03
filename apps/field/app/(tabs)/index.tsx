import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../src/lib/supabase';
import { format } from 'date-fns';

interface AssignedLot {
  id: string;
  house_id: string;
  status: string;
  expected_start_date: string | null;
  expected_end_date: string | null;
  house: {
    id: string;
    lot_number: string;
    address: string | null;
    status: string;
    current_phase: number;
    progress_percentage: number;
    site: {
      id: string;
      name: string;
    };
  };
}

const STATUS_COLORS: Record<string, string> = {
  not_started: '#6B7280',
  in_progress: '#F59E0B',
  delayed: '#EF4444',
  completed: '#10B981',
  on_hold: '#8B5CF6',
};

export default function MyLotsScreen() {
  const [assignments, setAssignments] = useState<AssignedLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in - show empty state
        setAssignments([]);
        return;
      }

      // Load assignments with house and site details
      const { data, error } = await supabase
        .from('house_assignments')
        .select(`
          id,
          house_id,
          status,
          expected_start_date,
          expected_end_date,
          house:houses (
            id,
            lot_number,
            address,
            status,
            current_phase,
            progress_percentage,
            site:sites (
              id,
              name
            )
          )
        `)
        .eq('worker_id', user.id)
        .eq('status', 'accepted')
        .order('expected_end_date', { ascending: true });

      if (error) {
        console.error('Error loading assignments:', error);
        // For now, show demo data if table doesn't exist
        setAssignments([]);
        return;
      }

      // Filter out any assignments where house was deleted and transform data
      const validAssignments = (data || [])
        .filter((a: any) => a.house)
        .map((a: any) => ({
          ...a,
          house: Array.isArray(a.house) ? a.house[0] : a.house,
        }))
        .filter((a: any) => a.house);
      setAssignments(validAssignments as unknown as AssignedLot[]);
    } catch (error) {
      console.error('Error loading assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  }, []);

  const navigateToLot = (lotId: string) => {
    router.push(`/lot/${lotId}`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading your lots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{assignments.length}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
            {assignments.filter(a => a.house?.status === 'in_progress').length}
          </Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {assignments.filter(a => a.house?.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Lot List */}
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
        renderItem={({ item }) => {
          const house = item.house;
          if (!house) return null;

          const statusColor = STATUS_COLORS[house.status] || STATUS_COLORS.not_started;
          const dueDate = item.expected_end_date
            ? format(new Date(item.expected_end_date), 'MMM d, yyyy')
            : null;

          return (
            <TouchableOpacity
              style={styles.lotCard}
              onPress={() => navigateToLot(house.id)}
              activeOpacity={0.7}
            >
              <View style={styles.lotHeader}>
                <View style={styles.lotTitleRow}>
                  <Text style={styles.lotNumber}>Lot {house.lot_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>
                      {house.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.siteName}>{house.site?.name || 'Unknown Site'}</Text>
                {house.address && (
                  <Text style={styles.address}>{house.address}</Text>
                )}
              </View>

              {/* Progress Bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    Phase {house.current_phase} of 7
                  </Text>
                  <Text style={styles.progressPercent}>
                    {house.progress_percentage}%
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${house.progress_percentage}%` }
                    ]}
                  />
                </View>
              </View>

              {/* Due Date */}
              {dueDate && (
                <View style={styles.dueSection}>
                  <Text style={styles.dueIcon}>📅</Text>
                  <Text style={styles.dueText}>Due: {dueDate}</Text>
                </View>
              )}

              {/* Tap indicator */}
              <Text style={styles.tapHint}>Tap to view details →</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Lots Assigned</Text>
            <Text style={styles.emptyText}>
              Scan a QR code on a lot to access its details
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => router.push('/(tabs)/scan')}
            >
              <Text style={styles.scanButtonIcon}>📷</Text>
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
    backgroundColor: '#111827',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // List
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  lotCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  lotHeader: {
    marginBottom: 16,
  },
  lotTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lotNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
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
    textTransform: 'capitalize',
  },
  siteName: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 4,
  },
  address: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  // Progress
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  progressPercent: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  // Due
  dueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dueIcon: {
    fontSize: 14,
  },
  dueText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  tapHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonIcon: {
    fontSize: 20,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
