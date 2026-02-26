/**
 * Schedule view — shows phases with expected vs actual dates.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { House } from '@onsite/shared';

const ACCENT = '#0F766E';

interface SchedulePhase {
  id: string;
  schedule_id: string;
  phase_id: string;
  expected_start_date: string | null;
  expected_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: string;
  blocked_reason: string | null;
}

interface Schedule {
  id: string;
  house_id: string;
  status: string;
  expected_start_date: string | null;
  expected_end_date: string | null;
  deviation_days: number | null;
  ai_risk_score: number | null;
}

interface ScheduleViewProps {
  siteId: string;
  houses: House[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#6B7280',
  in_progress: '#EA580C',
  blocked: '#DC2626',
  inspection: '#7C3AED',
  completed: '#16A34A',
  skipped: '#9CA3AF',
};

export default function ScheduleView({ siteId, houses }: ScheduleViewProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchSchedules() {
    try {
      const houseIds = houses.map((h) => h.id);
      if (houseIds.length === 0) {
        setSchedules([]);
        return;
      }

      const { data, error } = await supabase
        .from('egl_schedules')
        .select('*')
        .in('house_id', houseIds)
        .order('expected_start_date', { ascending: true });

      if (error) throw error;
      setSchedules((data as Schedule[]) || []);
    } catch (err) {
      console.error('[schedule] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchSchedules();
  }, [houses]);

  function getHouseName(houseId: string): string {
    const house = houses.find((h) => h.id === houseId);
    return house ? `Lot ${house.lot_number}` : 'Unknown';
  }

  function formatDate(date: string | null): string {
    if (!date) return '-';
    try {
      return format(new Date(date), 'MMM d');
    } catch {
      return '-';
    }
  }

  function renderScheduleCard({ item }: { item: Schedule }) {
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const hasDeviation = item.deviation_days != null && item.deviation_days !== 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.lotName}>{getHouseName(item.house_id)}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Expected</Text>
            <Text style={styles.dateValue}>
              {formatDate(item.expected_start_date)} - {formatDate(item.expected_end_date)}
            </Text>
          </View>
          {hasDeviation && (
            <View style={[styles.deviationBadge, item.deviation_days! > 0 ? styles.deviationLate : styles.deviationEarly]}>
              <Text style={styles.deviationText}>
                {item.deviation_days! > 0 ? '+' : ''}{item.deviation_days}d
              </Text>
            </View>
          )}
        </View>

        {item.ai_risk_score != null && item.ai_risk_score > 0.5 && (
          <Text style={styles.riskLabel}>
            Risk: {Math.round(item.ai_risk_score * 100)}%
          </Text>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (schedules.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No schedules</Text>
        <Text style={styles.emptySubtitle}>
          Schedule templates can be assigned to lots from the Monitor web app.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={schedules}
      renderItem={renderScheduleCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchSchedules();
          }}
          tintColor={ACCENT}
          colors={[ACCENT]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBlock: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dateValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  deviationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deviationLate: {
    backgroundColor: '#FEF2F2',
  },
  deviationEarly: {
    backgroundColor: '#F0FDF4',
  },
  deviationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  riskLabel: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
    fontWeight: '500',
  },
});
