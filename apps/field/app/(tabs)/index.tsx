/**
 * Sites Tab — EagleField Home Screen
 *
 * Shows the worker's assigned lots with:
 * - Header: "Eagle Field" branding + LIVE badge + site info
 * - Current Task Card: active assignment (if any)
 * - YOUR HOUSES: lot cards with phase progress, issues, activity
 *
 * Data flow:
 *   1. Find crews via frm_crew_workers (worker_id = user.id)
 *   2. Find assigned lots via frm_phase_assignments (crew_id IN crewIds)
 *   3. Load lot details from frm_lots + frm_jobsites
 *   4. Count open issues from frm_house_items
 *   5. Find current task from frm_phase_assignments (status = 'started')
 */

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../src/lib/supabase';
import { FRAMING_PHASES } from '@onsite/framing';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Jobsite {
  id: string;
  name: string;
}

interface HouseData {
  id: string;
  lot_number: string;
  address: string | null;
  status: string;
  current_phase: string | null;
  jobsite_id: string;
  jobsite: Jobsite | null;
  progress_pct: number;
  open_issues: number;
  last_activity: string | null;
  last_activity_title: string | null;
}

interface CurrentTask {
  id: string;
  lot_id: string;
  lot_number: string;
  phase_id: string;
  phase_name: string;
  started_at: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#0F766E';
const ORANGE = '#F97316';
const BG = '#F6F7F9';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#101828';
const TEXT_GRAY = '#6B7280';
const TEXT_LIGHT = '#9CA3AF';

const STATUS_COLORS: Record<string, string> = {
  pending: '#6B7280',
  released: '#3B82F6',
  in_progress: '#F59E0B',
  paused_for_trades: '#8B5CF6',
  backframe: '#06B6D4',
  inspection: '#EF4444',
  completed: '#10B981',
};

const PHASE_COLORS: Record<string, string> = {
  capping: '#6B7280',
  floor_1: '#3B82F6',
  walls_1: '#8B5CF6',
  floor_2: '#3B82F6',
  walls_2: '#8B5CF6',
  roof: '#F97316',
  backframe_basement: '#06B6D4',
  backframe_strapping: '#06B6D4',
  backframe_backing: '#06B6D4',
};

const LOT_CIRCLE_COLORS = [
  '#10B981',
  '#F97316',
  '#6366F1',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPhaseProgress(phaseId: string | null): number {
  if (!phaseId) return 0;
  const idx = FRAMING_PHASES.findIndex((p) => p.id === phaseId);
  if (idx < 0) return 0;
  // Each completed phase = fraction of total. Current phase = halfway through.
  return Math.round(((idx + 0.5) / FRAMING_PHASES.length) * 100);
}

function getPhaseName(phaseId: string | null): string {
  if (!phaseId) return 'Not Started';
  return FRAMING_PHASES.find((p) => p.id === phaseId)?.name ?? phaseId;
}

function formatActivityTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const time = format(date, 'h:mm a');
    if (isToday(date)) return `Today ${time}`;
    if (isTomorrow(date)) return `Tomorrow ${time}`;
    if (isYesterday(date)) return `Yesterday ${time}`;
    return format(date, 'MMM d') + ' ' + time;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SitesScreen() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<HouseData[]>([]);
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const assignedCount = houses.length;

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    try {
      if (!user) return;

      // 1. Find crews this worker belongs to
      const { data: crewMemberships } = await supabase
        .from('frm_crew_workers')
        .select('crew_id')
        .eq('worker_id', user.id)
        .is('left_at', null);

      const crewIds = (crewMemberships || []).map((m) => m.crew_id);

      if (crewIds.length === 0) {
        setHouses([]);
        setCurrentTask(null);
        setSiteName(null);
        setLoading(false);
        return;
      }

      // 2. Find current active task (status = 'started', most recent)
      const { data: activeAssignments } = await supabase
        .from('frm_phase_assignments')
        .select(`
          id, lot_id, phase_id, started_at,
          lot:frm_lots(id, lot_number)
        `)
        .in('crew_id', crewIds)
        .eq('status', 'started')
        .order('started_at', { ascending: false })
        .limit(1);

      if (activeAssignments && activeAssignments.length > 0) {
        const a = activeAssignments[0];
        const lot = Array.isArray(a.lot) ? a.lot[0] : a.lot;
        setCurrentTask({
          id: a.id,
          lot_id: a.lot_id,
          lot_number: lot?.lot_number ?? '',
          phase_id: a.phase_id,
          phase_name: getPhaseName(a.phase_id),
          started_at: a.started_at,
        });
      } else {
        setCurrentTask(null);
      }

      // 3. Find all lots assigned to worker's crews
      const { data: assignments } = await supabase
        .from('frm_phase_assignments')
        .select('lot_id')
        .in('crew_id', crewIds)
        .neq('status', 'cancelled');

      const lotIds = [...new Set((assignments || []).map((a) => a.lot_id))];

      if (lotIds.length === 0) {
        setHouses([]);
        setSiteName(null);
        setLoading(false);
        return;
      }

      // 4. Load lot details with jobsite
      const { data: lotsData, error: lotsError } = await supabase
        .from('frm_lots')
        .select(`
          id, lot_number, address, status, current_phase, jobsite_id,
          jobsite:frm_jobsites(id, name)
        `)
        .in('id', lotIds)
        .order('lot_number', { ascending: true });

      if (lotsError) {
        console.error('Error loading lots:', lotsError);
        setHouses([]);
        setLoading(false);
        return;
      }

      const lots = lotsData || [];

      // Extract site name from first lot
      if (lots.length > 0) {
        const firstJobsite = Array.isArray(lots[0].jobsite)
          ? lots[0].jobsite[0]
          : lots[0].jobsite;
        setSiteName(firstJobsite?.name ?? null);
      }

      // 5. Count open issues per lot (batch query)
      const { data: issueRows } = await supabase
        .from('frm_house_items')
        .select('lot_id')
        .in('lot_id', lotIds)
        .neq('status', 'resolved');

      const issueCounts: Record<string, number> = {};
      (issueRows || []).forEach((row) => {
        issueCounts[row.lot_id] = (issueCounts[row.lot_id] || 0) + 1;
      });

      // 6. Get last timeline event per lot (most recent activity)
      const { data: timelineRows } = await supabase
        .from('frm_timeline')
        .select('lot_id, title, created_at')
        .in('lot_id', lotIds)
        .order('created_at', { ascending: false })
        .limit(lotIds.length * 2);

      const lastActivity: Record<string, { title: string; created_at: string }> = {};
      (timelineRows || []).forEach((row) => {
        if (!lastActivity[row.lot_id]) {
          lastActivity[row.lot_id] = {
            title: row.title,
            created_at: row.created_at,
          };
        }
      });

      // 7. Build house data
      const housesData: HouseData[] = lots.map((lot: any) => {
        const jobsite = Array.isArray(lot.jobsite) ? lot.jobsite[0] : lot.jobsite;
        const activity = lastActivity[lot.id];
        return {
          id: lot.id,
          lot_number: lot.lot_number,
          address: lot.address,
          status: lot.status,
          current_phase: lot.current_phase,
          jobsite_id: lot.jobsite_id,
          jobsite: jobsite || null,
          progress_pct: getPhaseProgress(lot.current_phase),
          open_issues: issueCounts[lot.id] || 0,
          last_activity: activity?.created_at ?? null,
          last_activity_title: activity?.title ?? null,
        };
      });

      setHouses(housesData);
    } catch (error) {
      console.error('Error loading data:', error);
      setHouses([]);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user]);

  // Get the formatted current time for the task card
  const currentTaskTime = useMemo(() => {
    if (!currentTask?.started_at) return null;
    try {
      return format(new Date(currentTask.started_at), 'h:mm a');
    } catch {
      return null;
    }
  }, [currentTask?.started_at]);

  // Phase description for the current task
  const currentTaskDescription = useMemo(() => {
    if (!currentTask) return '';
    const phase = FRAMING_PHASES.find((p) => p.id === currentTask.phase_id);
    return phase?.description ?? currentTask.phase_name;
  }, [currentTask]);

  // -------------------------------------------
  // Loading state
  // -------------------------------------------
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading your lots...</Text>
      </View>
    );
  }

  // -------------------------------------------
  // Render
  // -------------------------------------------
  return (
    <View style={styles.container}>
      {/* ============ HEADER ============ */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.titleEagle}>Eagle</Text>
            <Text style={styles.titleField}>Field</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {}}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={22} color={TEXT_DARK} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push('/(tabs)/config')}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={22} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>
        </View>
        {siteName && (
          <Text style={styles.headerSubtitle}>
            {siteName} — {assignedCount} house{assignedCount !== 1 ? 's' : ''} assigned
          </Text>
        )}
        {!siteName && assignedCount > 0 && (
          <Text style={styles.headerSubtitle}>
            {assignedCount} house{assignedCount !== 1 ? 's' : ''} assigned
          </Text>
        )}
      </View>

      <FlatList
        data={houses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
        ListHeaderComponent={
          <>
            {/* ============ CURRENT TASK CARD ============ */}
            {currentTask && (
              <TouchableOpacity
                style={styles.currentTaskCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/lot/${currentTask.lot_id}`)}
              >
                <View style={styles.currentTaskTimeRow}>
                  <Ionicons name="time-outline" size={16} color={ORANGE} />
                  <Text style={styles.currentTaskTimeText}>
                    NOW{currentTaskTime ? ` \u2014 ${currentTaskTime}` : ''}
                  </Text>
                </View>
                <Text style={styles.currentTaskTitle}>
                  {currentTask.phase_name} — {currentTaskDescription}
                </Text>
                <Text style={styles.currentTaskSubtitle}>
                  Lot {currentTask.lot_number}
                </Text>
              </TouchableOpacity>
            )}

            {/* ============ SECTION LABEL ============ */}
            {houses.length > 0 && (
              <Text style={styles.sectionLabel}>YOUR HOUSES</Text>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <LotCard house={item} index={index} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Lots Assigned</Text>
            <Text style={styles.emptyText}>
              Scan a site QR code to connect to your construction site and see your assigned lots.
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => router.push('/scanner')}
              activeOpacity={0.7}
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

// ---------------------------------------------------------------------------
// LotCard sub-component
// ---------------------------------------------------------------------------

function LotCard({ house, index }: { house: HouseData; index: number }) {
  const circleColor = LOT_CIRCLE_COLORS[index % LOT_CIRCLE_COLORS.length];
  const phaseColor = PHASE_COLORS[house.current_phase ?? ''] ?? TEXT_GRAY;
  const phaseName = getPhaseName(house.current_phase);
  const progressPct = house.progress_pct;
  const hasIssues = house.open_issues > 0;

  return (
    <TouchableOpacity
      style={styles.lotCard}
      onPress={() => router.push(`/lot/${house.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.lotCardRow}>
        {/* Left: Lot circle */}
        <View style={styles.lotCircleContainer}>
          <View style={[styles.lotCircle, { backgroundColor: circleColor }]}>
            <Text style={styles.lotCircleText}>{house.lot_number}</Text>
          </View>
          {hasIssues && (
            <View style={styles.issueBadge}>
              <Text style={styles.issueBadgeText}>{house.open_issues}</Text>
            </View>
          )}
        </View>

        {/* Center: Lot info */}
        <View style={styles.lotCardCenter}>
          <View style={styles.lotTitleRow}>
            <Text style={styles.lotTitle}>Lot {house.lot_number}</Text>
            {hasIssues && (
              <Ionicons
                name="warning"
                size={14}
                color="#F59E0B"
                style={styles.warningIcon}
              />
            )}
          </View>
          {house.address ? (
            <Text style={styles.lotAddress} numberOfLines={1}>
              {house.address}
            </Text>
          ) : (
            <Text style={styles.lotAddress} numberOfLines={1}>
              {house.jobsite?.name ?? 'Unknown Site'}
            </Text>
          )}

          {/* Phase pill */}
          <View style={styles.phasePillRow}>
            <View style={styles.phasePill}>
              <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
              <Text style={styles.phasePillText}>{phaseName}</Text>
              <Text style={[styles.phasePillPct, { color: phaseColor }]}>
                {progressPct}%
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(progressPct, 100)}%`,
                  backgroundColor: phaseColor,
                },
              ]}
            />
          </View>

          {/* Last activity */}
          {house.last_activity && house.last_activity_title && (
            <Text style={styles.lastActivity} numberOfLines={1}>
              {house.last_activity_title} {'\u00B7'}{' '}
              {formatActivityTime(house.last_activity)}
            </Text>
          )}
        </View>

        {/* Right: Chevron */}
        <View style={styles.lotChevron}>
          <Ionicons name="chevron-forward" size={18} color={TEXT_LIGHT} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  loadingText: {
    color: TEXT_GRAY,
    marginTop: 12,
    fontSize: 14,
  },

  // ---- Header ----
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 56,
    paddingBottom: 16,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleEagle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
  },
  titleField: {
    fontSize: 26,
    fontWeight: '700',
    color: ORANGE,
  },
  liveBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginTop: 6,
  },

  // ---- List ----
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // ---- Current Task Card ----
  currentTaskCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
  },
  currentTaskTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  currentTaskTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: ORANGE,
    letterSpacing: 0.3,
  },
  currentTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  currentTaskSubtitle: {
    fontSize: 13,
    color: TEXT_GRAY,
  },

  // ---- Section Label ----
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_LIGHT,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
  },

  // ---- Lot Card ----
  lotCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  lotCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lotCircleContainer: {
    position: 'relative',
    marginRight: 14,
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
  issueBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: CARD_BG,
  },
  issueBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  lotCardCenter: {
    flex: 1,
  },
  lotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  warningIcon: {
    marginLeft: 6,
  },
  lotAddress: {
    fontSize: 13,
    color: TEXT_GRAY,
    marginTop: 2,
  },

  // ---- Phase Pill ----
  phasePillRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phasePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_DARK,
  },
  phasePillPct: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ---- Progress Bar ----
  progressBarBg: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // ---- Last Activity ----
  lastActivity: {
    fontSize: 12,
    color: TEXT_LIGHT,
    marginTop: 8,
  },

  // ---- Chevron ----
  lotChevron: {
    justifyContent: 'center',
    paddingLeft: 8,
    paddingTop: 10,
  },

  // ---- Empty State ----
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: TEXT_DARK,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_GRAY,
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
