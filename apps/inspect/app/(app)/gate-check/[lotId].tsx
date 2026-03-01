/**
 * Gate Check Selector — Shows 4 transition cards for a lot.
 *
 * Each card shows the transition label, current status, and progress.
 * Tapping starts a new gate check (if not started) or resumes an existing one.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@onsite/auth';
import { supabase } from '../../../src/lib/supabase';
import {
  type GateCheckTransition,
  type FrmGateCheck,
  type FrmGateCheckItem,
  GATE_CHECK_TRANSITIONS,
  TRANSITION_LABELS,
  TRANSITION_ITEM_COUNTS,
  getLatestGateCheck,
  startGateCheck,
} from '@onsite/framing';

const ACCENT = '#0F766E';

interface LotInfo {
  id: string;
  lot_number: string;
  jobsite_id: string;
  site_name?: string;
}

interface TransitionState {
  transition: GateCheckTransition;
  label: string;
  expectedItems: number;
  gateCheck: (FrmGateCheck & { items: FrmGateCheckItem[] }) | null;
}

export default function GateCheckSelectorScreen() {
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [lot, setLot] = useState<LotInfo | null>(null);
  const [transitions, setTransitions] = useState<TransitionState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingTransition, setStartingTransition] = useState<GateCheckTransition | null>(null);

  const fetchData = useCallback(async () => {
    if (!lotId) return;
    try {
      // Fetch lot info with site name
      const { data: lotData, error: lotError } = await supabase
        .from('frm_lots')
        .select('id, lot_number, jobsite_id, jobsite:frm_jobsites(name)')
        .eq('id', lotId)
        .single();

      if (lotError) throw lotError;

      const lotInfo: LotInfo = {
        id: lotData.id,
        lot_number: lotData.lot_number,
        jobsite_id: lotData.jobsite_id,
        site_name: (lotData as any).jobsite?.name ?? undefined,
      };
      setLot(lotInfo);

      // Fetch latest gate check for each transition
      const states: TransitionState[] = await Promise.all(
        GATE_CHECK_TRANSITIONS.map(async (transition) => {
          const gateCheck = await getLatestGateCheck(supabase, lotId, transition);
          return {
            transition,
            label: TRANSITION_LABELS[transition],
            expectedItems: TRANSITION_ITEM_COUNTS[transition],
            gateCheck,
          };
        }),
      );

      setTransitions(states);
    } catch (err) {
      console.error('[gate-check] Fetch error:', err);
      Alert.alert('Error', 'Failed to load gate check data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lotId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  async function handleTransitionPress(state: TransitionState) {
    if (!lotId || !user?.id) return;

    // If there's an existing in_progress check, navigate directly
    if (state.gateCheck && state.gateCheck.status === 'in_progress') {
      router.push({
        pathname: '/(app)/gate-check/checklist',
        params: { gateCheckId: state.gateCheck.id, lotId },
      });
      return;
    }

    // If already passed or failed, navigate to summary
    if (state.gateCheck && (state.gateCheck.status === 'passed' || state.gateCheck.status === 'failed')) {
      router.push({
        pathname: '/(app)/gate-check/summary',
        params: { gateCheckId: state.gateCheck.id, lotId },
      });
      return;
    }

    // Not started yet — create a new gate check
    setStartingTransition(state.transition);
    try {
      const result = await startGateCheck(supabase, lotId, state.transition, user.id);
      router.push({
        pathname: '/(app)/gate-check/checklist',
        params: { gateCheckId: result.gateCheck.id, lotId },
      });
    } catch (err: any) {
      console.error('[gate-check] Start error:', err);
      Alert.alert('Error', err?.message || 'Failed to start gate check');
    } finally {
      setStartingTransition(null);
    }
  }

  function getStatusDisplay(state: TransitionState) {
    if (!state.gateCheck) {
      return { label: 'Not Started', color: '#9CA3AF', bgColor: '#F3F4F6', icon: '' };
    }

    switch (state.gateCheck.status) {
      case 'in_progress': {
        const checked = state.gateCheck.items.filter((i) => i.result !== 'pending').length;
        const total = state.gateCheck.items.length;
        return {
          label: `In Progress (${checked}/${total})`,
          color: '#2563EB',
          bgColor: '#EFF6FF',
          icon: '',
        };
      }
      case 'passed':
        return { label: 'Passed', color: '#059669', bgColor: '#ECFDF5', icon: '' };
      case 'failed':
        return { label: 'Failed', color: '#DC2626', bgColor: '#FEF2F2', icon: '' };
      default:
        return { label: 'Unknown', color: '#9CA3AF', bgColor: '#F3F4F6', icon: '' };
    }
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!lot) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Lot not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Gate Checks</Text>
          <Text style={styles.headerSubtitle}>
            Lot {lot.lot_number}{lot.site_name ? ` - ${lot.site_name}` : ''}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Transition Cards */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >
        <Text style={styles.sectionLabel}>Select a transition to inspect</Text>

        {transitions.map((state, index) => {
          const status = getStatusDisplay(state);
          const isStarting = startingTransition === state.transition;

          return (
            <TouchableOpacity
              key={state.transition}
              style={styles.card}
              onPress={() => handleTransitionPress(state)}
              activeOpacity={0.7}
              disabled={isStarting}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardNumberBadge}>
                  <Text style={styles.cardNumber}>{index + 1}</Text>
                </View>
                <View style={styles.cardTitleArea}>
                  <Text style={styles.cardTitle}>{state.label}</Text>
                  <Text style={styles.cardItemCount}>
                    {state.expectedItems} checklist items
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                  {isStarting ? (
                    <ActivityIndicator size="small" color={ACCENT} />
                  ) : (
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.icon ? `${status.icon} ` : ''}{status.label}
                    </Text>
                  )}
                </View>

                {/* Progress bar for in_progress */}
                {state.gateCheck?.status === 'in_progress' && (
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.round(
                              (state.gateCheck.items.filter((i) => i.result !== 'pending').length /
                                state.gateCheck.items.length) *
                                100,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                <Text style={styles.cardArrow}>
                  {state.gateCheck?.status === 'passed' || state.gateCheck?.status === 'failed'
                    ? 'View'
                    : state.gateCheck?.status === 'in_progress'
                    ? 'Resume'
                    : 'Start'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 60,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 16,
    color: ACCENT,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#667085',
    marginTop: 2,
  },

  // Content
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
  },
  cardItemCount: {
    fontSize: 13,
    color: '#667085',
    marginTop: 2,
  },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  cardArrow: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
});
