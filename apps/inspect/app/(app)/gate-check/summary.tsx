/**
 * Gate Check Summary — Result screen after completing a gate check.
 *
 * Shows pass/fail result, stats, and list of failed items with photos.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../src/lib/supabase';
import {
  type FrmGateCheck,
  type FrmGateCheckItem,
  type GateCheckTransition,
  TRANSITION_LABELS,
  getGateCheck,
  getTemplateItems,
} from '@onsite/framing';

const ACCENT = '#0F766E';

export default function SummaryScreen() {
  const { gateCheckId, lotId } = useLocalSearchParams<{
    gateCheckId: string;
    lotId: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [gateCheck, setGateCheck] = useState<(FrmGateCheck & { items: FrmGateCheckItem[] }) | null>(null);
  const [blockingCodes, setBlockingCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!gateCheckId) return;
    try {
      const data = await getGateCheck(supabase, gateCheckId);
      setGateCheck(data);

      // Get blocking info from templates
      const templates = await getTemplateItems(supabase, data.transition as GateCheckTransition);
      setBlockingCodes(new Set(templates.filter((t) => t.is_blocking).map((t) => t.item_code)));
    } catch (err) {
      console.error('[summary] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [gateCheckId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!gateCheck) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Gate check not found</Text>
      </View>
    );
  }

  const transitionLabel =
    TRANSITION_LABELS[gateCheck.transition as GateCheckTransition] || gateCheck.transition;
  const isPassed = gateCheck.status === 'passed';

  // Stats
  const passedItems = gateCheck.items.filter((i) => i.result === 'pass');
  const failedItems = gateCheck.items.filter((i) => i.result === 'fail');
  const naItems = gateCheck.items.filter((i) => i.result === 'na');
  const failedBlockingItems = failedItems.filter((i) => blockingCodes.has(i.item_code));
  const failedNonBlockingItems = failedItems.filter((i) => !blockingCodes.has(i.item_code));

  const completedAt = gateCheck.completed_at
    ? new Date(gateCheck.completed_at).toLocaleString()
    : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Gate Check Result</Text>
          <Text style={styles.headerSubtitle}>{transitionLabel}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Big result card */}
        <View style={[styles.resultCard, isPassed ? styles.resultCardPass : styles.resultCardFail]}>
          <View style={[styles.resultIconCircle, isPassed ? styles.iconCirclePass : styles.iconCircleFail]}>
            <Text style={styles.resultIcon}>{isPassed ? '\u2713' : '\u2717'}</Text>
          </View>
          <Text style={[styles.resultTitle, isPassed ? styles.resultTitlePass : styles.resultTitleFail]}>
            {isPassed ? 'PASSED' : 'FAILED'}
          </Text>
          <Text style={styles.resultMessage}>
            {isPassed
              ? 'All clear! This transition has been approved.'
              : `${failedBlockingItems.length} blocking item(s) failed. Corrections required before release.`}
          </Text>
          {completedAt ? (
            <Text style={styles.resultDate}>Completed {completedAt}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{gateCheck.items.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#059669' }]}>{passedItems.length}</Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#DC2626' }]}>{failedItems.length}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#9CA3AF' }]}>{naItems.length}</Text>
            <Text style={styles.statLabel}>N/A</Text>
          </View>
        </View>

        {/* Failed blocking items */}
        {failedBlockingItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.sectionTitle}>
                Blocking Failures ({failedBlockingItems.length})
              </Text>
            </View>
            {failedBlockingItems.map((item) => (
              <FailedItemCard key={item.id} item={item} isBlocking />
            ))}
          </View>
        )}

        {/* Failed non-blocking items */}
        {failedNonBlockingItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.sectionTitle}>
                Non-Blocking Failures ({failedNonBlockingItems.length})
              </Text>
            </View>
            {failedNonBlockingItems.map((item) => (
              <FailedItemCard key={item.id} item={item} isBlocking={false} />
            ))}
          </View>
        )}

        {/* Passed items summary */}
        {passedItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#059669' }]} />
              <Text style={styles.sectionTitle}>
                Passed ({passedItems.length})
              </Text>
            </View>
            <View style={styles.passedList}>
              {passedItems.map((item) => (
                <View key={item.id} style={styles.passedItem}>
                  <Text style={styles.passedCheck}>{'\u2713'}</Text>
                  <Text style={styles.passedLabel} numberOfLines={1}>
                    {item.item_label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom action */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.backToLotBtn}
          onPress={() => {
            if (lotId) {
              router.replace(`/(app)/lot/${lotId}`);
            } else {
              router.replace('/(app)/');
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.backToLotBtnText}>Back to Lot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Card for a single failed item with photo and notes */
function FailedItemCard({
  item,
  isBlocking,
}: {
  item: FrmGateCheckItem;
  isBlocking: boolean;
}) {
  return (
    <View style={styles.failCard}>
      <View style={styles.failCardHeader}>
        <Text style={styles.failCardCode}>{item.item_code}</Text>
        {isBlocking && (
          <View style={styles.blockingBadge}>
            <Text style={styles.blockingBadgeText}>BLOCKING</Text>
          </View>
        )}
      </View>
      <Text style={styles.failCardLabel}>{item.item_label}</Text>

      {item.photo_url ? (
        <Image
          source={{ uri: item.photo_url }}
          style={styles.failCardPhoto}
          resizeMode="cover"
        />
      ) : null}

      {item.notes ? (
        <View style={styles.failCardNotes}>
          <Text style={styles.failCardNotesLabel}>Notes:</Text>
          <Text style={styles.failCardNotesText}>{item.notes}</Text>
        </View>
      ) : null}

      {item.deficiency_id ? (
        <View style={styles.deficiencyLink}>
          <Text style={styles.deficiencyLinkText}>
            Deficiency #{item.deficiency_id.slice(0, 8)}
          </Text>
        </View>
      ) : null}
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

  // Scroll
  scrollContent: {
    padding: 16,
  },

  // Result card
  resultCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCardPass: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#059669',
  },
  resultCardFail: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  resultIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCirclePass: {
    backgroundColor: '#059669',
  },
  iconCircleFail: {
    backgroundColor: '#DC2626',
  },
  resultIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  resultTitlePass: {
    color: '#059669',
  },
  resultTitleFail: {
    color: '#DC2626',
  },
  resultMessage: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  resultDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#101828',
  },
  statLabel: {
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
  },

  // Failed item card
  failCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  failCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  failCardCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  blockingBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  blockingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  failCardLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#101828',
    marginBottom: 10,
    lineHeight: 20,
  },
  failCardPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#F3F4F6',
  },
  failCardNotes: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  failCardNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667085',
    marginBottom: 2,
  },
  failCardNotesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  deficiencyLink: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deficiencyLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },

  // Passed items list
  passedList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  passedCheck: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '700',
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  passedLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backToLotBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backToLotBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
