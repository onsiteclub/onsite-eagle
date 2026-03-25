/**
 * Tasks — Phase checklists across all assigned houses
 *
 * Shows each lot's current phase checklist progress.
 * Filters by worker's crew assignments via frm_crew_workers + frm_phase_assignments.
 * Enterprise v3 light theme.
 */

import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../src/lib/supabase';
import { FRAMING_PHASES } from '@onsite/framing';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LotTask {
  id: string;
  lot_number: string;
  current_phase: string | null;
  jobsite_name: string | null;
  completed_items: number;
  total_items: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard checklist item counts per framing phase */
const PHASE_CHECKLIST_COUNTS: Record<string, number> = {
  capping: 6,
  floor_1: 10,
  walls_1: 10,
  floor_2: 10,
  walls_2: 10,
  roof: 8,
  backframe_basement: 7,
  backframe_strapping: 6,
  backframe_backing: 8,
};

/** Rotating colors for lot circles */
const LOT_COLORS = ['#10B981', '#F97316', '#6366F1', '#3B82F6', '#8B5CF6', '#EC4899'];

const ACCENT = '#0F766E';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProgressColor(pct: number): string {
  if (pct > 70) return '#10B981';
  if (pct >= 30) return '#F97316';
  return '#EF4444';
}

function getLotColor(index: number): string {
  return LOT_COLORS[index % LOT_COLORS.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TasksScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<LotTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  async function loadTasks() {
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
        setTasks([]);
        setLoading(false);
        return;
      }

      // 2. Find lots assigned to worker's crews (active assignments only)
      const { data: assignments } = await supabase
        .from('frm_phase_assignments')
        .select('lot_id')
        .in('crew_id', crewIds)
        .neq('status', 'cancelled');

      const lotIds = [...new Set((assignments || []).map(a => a.lot_id))];

      if (lotIds.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // 3. Load lot details with jobsite name
      const { data: lots, error } = await supabase
        .from('frm_lots')
        .select(`
          id, lot_number, current_phase,
          jobsite:frm_jobsites(name)
        `)
        .in('id', lotIds)
        .order('lot_number', { ascending: true });

      if (error) {
        console.error('Error loading lots for tasks:', error);
        setTasks([]);
        return;
      }

      if (!lots || lots.length === 0) {
        setTasks([]);
        return;
      }

      // 4. For each lot with a current_phase, count completed checklist items
      const lotsWithPhase = lots.filter(l => l.current_phase != null);
      const lotTaskResults: LotTask[] = [];

      // Batch query: get completed checklist counts for all lots at once
      if (lotsWithPhase.length > 0) {
        const { data: completedItems } = await supabase
          .from('frm_house_items')
          .select('lot_id, phase_id')
          .in('lot_id', lotsWithPhase.map(l => l.id))
          .eq('type', 'checklist')
          .eq('status', 'resolved');

        // Build a map: "lotId:phaseId" -> count
        const completedMap = new Map<string, number>();
        if (completedItems) {
          for (const item of completedItems) {
            const key = `${item.lot_id}:${item.phase_id}`;
            completedMap.set(key, (completedMap.get(key) || 0) + 1);
          }
        }

        for (const lot of lotsWithPhase) {
          const phase = lot.current_phase as string;
          const totalItems = PHASE_CHECKLIST_COUNTS[phase] || 0;
          const completedCount = completedMap.get(`${lot.id}:${phase}`) || 0;
          const jobsite = Array.isArray(lot.jobsite) ? lot.jobsite[0] : lot.jobsite;

          lotTaskResults.push({
            id: lot.id,
            lot_number: lot.lot_number,
            current_phase: phase,
            jobsite_name: jobsite?.name || null,
            completed_items: Math.min(completedCount, totalItems),
            total_items: totalItems,
          });
        }
      }

      // Include lots without a current phase (no checklist progress)
      const lotsWithoutPhase = lots.filter(l => l.current_phase == null);
      for (const lot of lotsWithoutPhase) {
        const jobsite = Array.isArray(lot.jobsite) ? lot.jobsite[0] : lot.jobsite;
        lotTaskResults.push({
          id: lot.id,
          lot_number: lot.lot_number,
          current_phase: null,
          jobsite_name: jobsite?.name || null,
          completed_items: 0,
          total_items: 0,
        });
      }

      setTasks(lotTaskResults);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [user]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderCard({ item, index }: { item: LotTask; index: number }) {
    const lotColor = getLotColor(index);
    const phaseName = item.current_phase
      ? FRAMING_PHASES.find(p => p.id === item.current_phase)?.name || item.current_phase
      : 'Not Started';

    const pct = item.total_items > 0
      ? Math.round((item.completed_items / item.total_items) * 100)
      : 0;

    const progressColor = getProgressColor(pct);

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: lotColor }]}
        onPress={() => router.push(`/lot/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          {/* Left: colored circle with lot number */}
          <View style={[styles.lotCircle, { backgroundColor: lotColor }]}>
            <Text style={styles.lotCircleText}>{item.lot_number}</Text>
          </View>

          {/* Center: lot info */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Lot {item.lot_number} — {phaseName}
            </Text>
            <Text style={styles.cardSubtitle}>
              {item.total_items > 0
                ? `${item.completed_items} of ${item.total_items} items complete`
                : 'No checklist for this phase'}
            </Text>
          </View>

          {/* Right: percentage */}
          <Text style={[styles.pctText, { color: progressColor }]}>
            {pct}%
          </Text>
        </View>

        {/* Progress bar */}
        {item.total_items > 0 && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${pct}%`,
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <Text style={styles.headerSubtitle}>Phase checklists across all houses</Text>
      </View>

      {/* Task list */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Tasks Assigned</Text>
            <Text style={styles.emptyText}>
              You have no active phase checklists. Tasks appear when your crew is assigned to a lot.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lotCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lotCircleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#101828',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  pctText: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },

  // Progress bar
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
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
  },
});
