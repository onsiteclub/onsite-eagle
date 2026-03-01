/**
 * Lots Tab - OnSite Timekeeper
 *
 * Shows assigned lots to the worker with QR scanner access
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../src/constants/colors';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { CONSTRUCTION_PHASES } from '@onsite/shared';

interface AssignedLot {
  id: string;
  lot_number: string;
  address: string | null;
  status: string;
  current_phase: number;
  progress_percentage: number;
  site_name: string;
  site_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  not_started: colors.iconMuted,
  in_progress: colors.amber,
  delayed: colors.error,
  completed: colors.green,
  on_hold: '#8B5CF6',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed',
  on_hold: 'On Hold',
};

export default function LotsScreen() {
  const { user } = useAuthStore();
  const [lots, setLots] = useState<AssignedLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAssignedLots();
  }, []);

  async function loadAssignedLots() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Load houses assigned to this worker via house_assignments
      const { data, error } = await supabase
        .from('frm_lots')
        .select(`
          id,
          lot_number,
          address,
          status,
          current_phase,
          progress_percentage,
          jobsite_id,
          jobsites!inner (
            id,
            name
          )
        `)
        .order('lot_number');

      if (error) throw error;

      if (data) {
        const transformedLots: AssignedLot[] = data.map((house: any) => ({
          id: house.id,
          lot_number: house.lot_number,
          address: house.address,
          status: house.status,
          current_phase: house.current_phase,
          progress_percentage: house.progress_percentage,
          site_id: house.jobsite_id,
          site_name: house.jobsites?.name || 'Unknown Site',
        }));
        setLots(transformedLots);
      }
    } catch (error) {
      console.error('Error loading lots:', error);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAssignedLots();
    setRefreshing(false);
  }, []);

  const openLot = (lot: AssignedLot) => {
    router.push(`/lot/${lot.id}`);
  };

  const openScanner = () => {
    router.push('/lot-scan');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading lots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Lots</Text>
        <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
          <Ionicons name="qr-code" size={20} color={colors.white} />
          <Text style={styles.scanButtonText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {lots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="business-outline" size={64} color={colors.iconMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Lots Assigned</Text>
            <Text style={styles.emptyText}>
              Scan a QR code on a lot to access it, or wait for your supervisor to assign lots to you.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openScanner}>
              <Ionicons name="qr-code" size={20} color={colors.white} />
              <Text style={styles.emptyButtonText}>Scan QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{lots.length}</Text>
                <Text style={styles.summaryLabel}>Total Lots</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {lots.filter(l => l.status === 'in_progress').length}
                </Text>
                <Text style={styles.summaryLabel}>In Progress</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {lots.filter(l => l.status === 'completed').length}
                </Text>
                <Text style={styles.summaryLabel}>Completed</Text>
              </View>
            </View>

            {/* Lots List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ASSIGNED LOTS</Text>
              {lots.map(lot => {
                const statusColor = STATUS_COLORS[lot.status] || colors.iconMuted;
                const phaseName = CONSTRUCTION_PHASES[lot.current_phase - 1]?.name || `Phase ${lot.current_phase}`;

                return (
                  <TouchableOpacity
                    key={lot.id}
                    style={styles.lotCard}
                    onPress={() => openLot(lot)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.lotAccent, { backgroundColor: statusColor }]} />
                    <View style={styles.lotContent}>
                      <View style={styles.lotHeader}>
                        <Text style={styles.lotNumber}>Lot {lot.lot_number}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                          <Text style={styles.statusText}>
                            {STATUS_LABELS[lot.status] || lot.status}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.siteName}>{lot.site_name}</Text>
                      {lot.address && <Text style={styles.address}>{lot.address}</Text>}

                      {/* Progress */}
                      <View style={styles.progressSection}>
                        <View style={styles.progressInfo}>
                          <Text style={styles.phaseName}>{phaseName}</Text>
                          <Text style={styles.progressPercent}>{lot.progress_percentage}%</Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${lot.progress_percentage}%`, backgroundColor: colors.accent }
                            ]}
                          />
                        </View>
                        <Text style={styles.phaseInfo}>Phase {lot.current_phase} of 7</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.iconMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  scanButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...shadows.sm,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  emptyButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  // Lot Card
  lotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  lotAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  lotContent: {
    flex: 1,
    padding: spacing.md,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lotNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  siteName: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  // Progress
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  phaseName: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  phaseInfo: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
