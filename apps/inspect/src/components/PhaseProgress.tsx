/**
 * Phase progress list for a house/lot.
 *
 * Fetches phases from frm_progress and ref_eagle_phases.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

const ACCENT = '#0F766E';

interface PhaseData {
  id: string;
  phase_id: string;
  phase_name: string;
  phase_order: number;
  status: string;
  approved_at: string | null;
  notes: string | null;
}

interface PhaseProgressProps {
  houseId: string;
}

const STATUS_ICONS: Record<string, { color: string; label: string }> = {
  pending: { color: '#D1D5DB', label: 'Pending' },
  in_progress: { color: '#F59E0B', label: 'In Progress' },
  ai_review: { color: '#8B5CF6', label: 'AI Review' },
  approved: { color: '#16A34A', label: 'Approved' },
  rejected: { color: '#DC2626', label: 'Rejected' },
};

export default function PhaseProgress({ houseId }: PhaseProgressProps) {
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPhases() {
      try {
        // Fetch progress entries joined with phase names
        const { data: progress, error: progressError } = await supabase
          .from('frm_progress')
          .select('*, ref_eagle_phases(name, order_index)')
          .eq('lot_id', houseId)
          .order('created_at', { ascending: true });

        if (progressError) throw progressError;

        const mapped: PhaseData[] = (progress || []).map((p: any) => ({
          id: p.id,
          phase_id: p.phase_id,
          phase_name: p.ref_eagle_phases?.name || `Phase ${p.phase_id}`,
          phase_order: p.ref_eagle_phases?.order_index || 0,
          status: p.status || 'pending',
          approved_at: p.approved_at,
          notes: p.notes,
        }));

        mapped.sort((a, b) => a.phase_order - b.phase_order);
        setPhases(mapped);
      } catch (err) {
        console.error('[phases] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPhases();
  }, [houseId]);

  if (loading) {
    return <ActivityIndicator size="small" color={ACCENT} style={{ padding: 20 }} />;
  }

  if (phases.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No phases assigned yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {phases.map((phase, idx) => {
        const statusInfo = STATUS_ICONS[phase.status] || STATUS_ICONS.pending;
        const isExpanded = expanded === phase.id;
        const isLast = idx === phases.length - 1;

        return (
          <TouchableOpacity
            key={phase.id}
            style={styles.phaseRow}
            onPress={() => setExpanded(isExpanded ? null : phase.id)}
            activeOpacity={0.7}
          >
            {/* Timeline line + dot */}
            <View style={styles.timeline}>
              <View style={[styles.dot, { backgroundColor: statusInfo.color }]} />
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Phase info */}
            <View style={styles.phaseInfo}>
              <View style={styles.phaseHeader}>
                <Text style={styles.phaseName}>{phase.phase_name}</Text>
                <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>

              {isExpanded && phase.notes && (
                <Text style={styles.notes}>{phase.notes}</Text>
              )}

              {isExpanded && phase.approved_at && (
                <Text style={styles.approvedAt}>
                  Approved: {new Date(phase.approved_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#667085',
  },
  phaseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeline: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  phaseInfo: {
    flex: 1,
    paddingBottom: 16,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#101828',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  notes: {
    fontSize: 13,
    color: '#667085',
    marginTop: 6,
    lineHeight: 18,
  },
  approvedAt: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
