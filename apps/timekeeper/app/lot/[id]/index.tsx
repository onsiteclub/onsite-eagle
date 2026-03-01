/**
 * Lot Detail Screen - OnSite Timekeeper
 *
 * Shows lot progress, timeline, and quick actions
 */

import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../../src/constants/colors';
import { supabase } from '../../../src/lib/supabase';
import { CONSTRUCTION_PHASES } from '@onsite/shared';

interface House {
  id: string;
  lot_number: string;
  address: string | null;
  status: string;
  current_phase: number;
  progress_percentage: number;
  site_id: string;
}

interface Site {
  id: string;
  name: string;
  address: string | null;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  source: string | null;
  created_at: string;
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

const EVENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  photo: 'camera',
  alert: 'warning',
  note: 'document-text',
  ai_validation: 'checkmark-circle',
  status_change: 'swap-horizontal',
  issue: 'alert-circle',
  inspection: 'search',
  document: 'folder',
  assignment: 'person',
};

const EVENT_COLORS: Record<string, string> = {
  photo: '#3B82F6',
  alert: colors.error,
  note: colors.iconMuted,
  ai_validation: colors.green,
  status_change: colors.amber,
  issue: colors.error,
  inspection: '#8B5CF6',
  document: '#6366F1',
  assignment: colors.green,
};

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadLotData();
    }
  }, [id]);

  async function loadLotData() {
    try {
      // Load house
      const { data: houseData } = await supabase
        .from('frm_lots')
        .select('*')
        .eq('id', id)
        .single();

      if (houseData) {
        setHouse(houseData);

        // Load site
        const { data: siteData } = await supabase
          .from('frm_jobsites')
          .select('id, name, address')
          .eq('id', houseData.site_id)
          .single();

        if (siteData) setSite(siteData);
      }

      // Load timeline
      const { data: timelineData } = await supabase
        .from('frm_timeline')
        .select('*')
        .eq('lot_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (timelineData) {
        setTimeline(timelineData);
      }
    } catch (error) {
      console.error('Error loading lot:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading lot details...</Text>
      </View>
    );
  }

  if (!house) {
    return (
      <View style={styles.centered}>
        <Ionicons name="home-outline" size={64} color={colors.iconMuted} />
        <Text style={styles.errorText}>Lot not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentPhase = CONSTRUCTION_PHASES[house.current_phase - 1] || CONSTRUCTION_PHASES[0];
  const statusColor = STATUS_COLORS[house.status] || STATUS_COLORS.not_started;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Lot ${house.lot_number}`,
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push(`/lot/${id}/documents`)}
            >
              <Ionicons name="folder" size={18} color={colors.accent} />
              <Text style={styles.headerButtonText}>Docs</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.lotHeader}>
            <Text style={styles.lotNumber}>Lot {house.lot_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>
                {STATUS_LABELS[house.status] || house.status}
              </Text>
            </View>
          </View>

          <Text style={styles.siteName}>{site?.name || 'Unknown Site'}</Text>
          {house.address && <Text style={styles.address}>{house.address}</Text>}

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.phaseName}>{currentPhase?.name || 'Phase 1'}</Text>
              <Text style={styles.progressPercent}>{house.progress_percentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${house.progress_percentage}%` }]} />
            </View>
            <Text style={styles.phaseInfo}>Phase {house.current_phase} of 7</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => router.push(`/camera?houseId=${house.id}&phaseId=${house.current_phase}`)}
            >
              <Ionicons name="camera" size={24} color={colors.white} />
              <Text style={styles.actionText}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.iconMuted }]}
              onPress={() => router.push(`/lot/${id}/notes`)}
            >
              <Ionicons name="document-text" size={24} color={colors.white} />
              <Text style={styles.actionText}>Note</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#6366F1' }]}
              onPress={() => router.push(`/lot/${id}/documents`)}
            >
              <Ionicons name="folder" size={24} color={colors.white} />
              <Text style={styles.actionText}>Docs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Phases Overview */}
        <View style={styles.phasesSection}>
          <Text style={styles.sectionTitle}>CONSTRUCTION PHASES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.phasesRow}>
              {CONSTRUCTION_PHASES.map((phase, index) => {
                const phaseNumber = index + 1;
                const isCompleted = phaseNumber < house.current_phase;
                const isCurrent = phaseNumber === house.current_phase;

                return (
                  <View key={phase.id} style={styles.phaseChip}>
                    <View style={[
                      styles.phaseIndicator,
                      { backgroundColor: isCompleted ? colors.green : isCurrent ? '#3B82F6' : colors.border }
                    ]}>
                      <Text style={[
                        styles.phaseIndicatorText,
                        { color: isCompleted || isCurrent ? colors.white : colors.textSecondary }
                      ]}>
                        {isCompleted ? '✓' : phaseNumber}
                      </Text>
                    </View>
                    <Text style={[
                      styles.phaseChipText,
                      isCurrent && styles.phaseChipTextCurrent
                    ]} numberOfLines={1}>
                      {phase.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>ACTIVITY TIMELINE</Text>

          {timeline.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Ionicons name="time-outline" size={40} color={colors.iconMuted} />
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>
                Take a photo or add a note to start the timeline
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {timeline.map((event, index) => {
                const eventColor = EVENT_COLORS[event.event_type] || colors.iconMuted;
                const iconName = EVENT_ICONS[event.event_type] || 'document';
                const isLast = index === timeline.length - 1;

                return (
                  <View key={event.id} style={styles.timelineItem}>
                    {/* Spine */}
                    <View style={styles.timelineSpine}>
                      <View style={[styles.timelineDot, { backgroundColor: eventColor }]}>
                        <Ionicons name={iconName} size={14} color={colors.white} />
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    {/* Content */}
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{event.title}</Text>
                      {event.description && (
                        <Text style={styles.timelineDesc}>{event.description}</Text>
                      )}
                      <Text style={styles.timelineDate}>
                        {format(new Date(event.created_at), 'MMM d, yyyy • h:mm a')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  errorText: {
    color: colors.error,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: borderRadius.sm,
    marginRight: 8,
    gap: 4,
  },
  headerButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '500',
  },
  // Header Card
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lotNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  siteName: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '500',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  phaseName: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 5,
  },
  phaseInfo: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  // Actions
  actionsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  // Phases
  phasesSection: {
    marginBottom: spacing.lg,
  },
  phasesRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  phaseChip: {
    alignItems: 'center',
    width: 70,
  },
  phaseIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  phaseIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  phaseChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  phaseChipTextCurrent: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Timeline
  timelineSection: {
    marginBottom: spacing.lg,
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineSpine: {
    alignItems: 'center',
    width: 50,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    minHeight: 40,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.iconMuted,
  },
  // Empty Timeline
  emptyTimeline: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 32,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.iconMuted,
    textAlign: 'center',
  },
});
