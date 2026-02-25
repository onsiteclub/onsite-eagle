/**
 * PlansViewer — List of construction plans assigned to the worker's site.
 *
 * READ-ONLY view. Plans are uploaded by supervisor in Monitor.
 * Shows PDF/image thumbnails with name, file type, and date.
 * Tapping opens PlanDetail for fullscreen viewing.
 *
 * Data: @onsite/media/data (fetchPlans)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@onsite/tokens';
import type { ConstructionPlan } from '@onsite/media';
import { fetchPlans } from '@onsite/media';
import { supabase } from '../../lib/supabase';
import { PlanDetail } from './PlanDetail';

/** Resolve the worker's assigned site_id */
async function resolveWorkerSiteId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: link } = await supabase
    .from('egl_site_workers')
    .select('site_id')
    .eq('worker_id', data.user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  return link?.site_id || null;
}

function getFileIcon(fileType: string): string {
  if (fileType === 'pdf') return 'PDF';
  if (fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg') return 'IMG';
  if (fileType === 'dwg') return 'DWG';
  return 'FILE';
}

function getFileIconColor(fileType: string): string {
  if (fileType === 'pdf') return '#DC2626';
  if (fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg') return '#3B82F6';
  if (fileType === 'dwg') return '#F59E0B';
  return colors.textSecondary;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PlanCardProps {
  plan: ConstructionPlan;
  onPress: (plan: ConstructionPlan) => void;
}

function PlanCard({ plan, onPress }: PlanCardProps) {
  const iconLabel = getFileIcon(plan.file_type);
  const iconColor = getFileIconColor(plan.file_type);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(plan)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: iconColor + '18' }]}>
        <Text style={[styles.iconText, { color: iconColor }]}>{iconLabel}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{plan.name}</Text>
        <Text style={styles.cardMeta}>
          {plan.file_type.toUpperCase()} · {formatDate(plan.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function PlansViewer() {
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [plans, setPlans] = useState<ConstructionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ConstructionPlan | null>(null);

  // Resolve site
  useEffect(() => {
    resolveWorkerSiteId().then((id) => {
      setSiteId(id);
      if (!id) setLoading(false);
    });
  }, []);

  // Fetch plans
  const loadPlans = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    const result = await fetchPlans(supabase as never, { site_id: siteId });
    setPlans(result.data || []);
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    if (siteId) loadPlans();
  }, [siteId, loadPlans]);

  const handleOpenPlan = useCallback((plan: ConstructionPlan) => {
    setSelectedPlan(plan);
  }, []);

  const handleClosePlan = useCallback(() => {
    setSelectedPlan(null);
  }, []);

  // If viewing a plan detail
  if (selectedPlan) {
    return <PlanDetail plan={selectedPlan} onClose={handleClosePlan} />;
  }

  // No site assigned
  if (!siteId && !loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No site assigned</Text>
        <Text style={styles.emptyText}>
          Link this worker to a jobsite in Monitor to see construction plans.
        </Text>
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Empty state
  if (plans.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No plans yet</Text>
        <Text style={styles.emptyText}>
          Construction plans uploaded by the foreman will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={plans}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PlanCard plan={item} onPress={handleOpenPlan} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
