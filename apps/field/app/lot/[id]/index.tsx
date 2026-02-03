import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
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
  not_started: '#6B7280',
  in_progress: '#F59E0B',
  delayed: '#EF4444',
  completed: '#10B981',
  on_hold: '#8B5CF6',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed',
  on_hold: 'On Hold',
};

const EVENT_ICONS: Record<string, string> = {
  photo: '📷',
  alert: '⚠️',
  note: '📝',
  ai_validation: '✅',
  status_change: '🔄',
  issue: '🚨',
  inspection: '🔍',
  document: '📄',
  assignment: '👤',
};

const EVENT_COLORS: Record<string, string> = {
  photo: '#3B82F6',
  alert: '#EF4444',
  note: '#6B7280',
  ai_validation: '#10B981',
  status_change: '#F59E0B',
  issue: '#EF4444',
  inspection: '#8B5CF6',
  document: '#6366F1',
  assignment: '#10B981',
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
        .from('houses')
        .select('*')
        .eq('id', id)
        .single();

      if (houseData) {
        setHouse(houseData);

        // Load site
        const { data: siteData } = await supabase
          .from('sites')
          .select('id, name, address')
          .eq('id', houseData.site_id)
          .single();

        if (siteData) setSite(siteData);
      }

      // Load timeline
      const { data: timelineData } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('house_id', id)
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
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading lot details...</Text>
      </View>
    );
  }

  if (!house) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>🏠</Text>
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
              <Text style={styles.headerButtonText}>📄 Docs</Text>
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
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => router.push(`/camera?houseId=${house.id}&phaseId=${house.current_phase}`)}
            >
              <Text style={styles.actionIcon}>📷</Text>
              <Text style={styles.actionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
              onPress={() => router.push(`/lot/${id}/notes`)}
            >
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={styles.actionText}>Add Note</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#6366F1' }]}
              onPress={() => router.push(`/lot/${id}/documents`)}
            >
              <Text style={styles.actionIcon}>📄</Text>
              <Text style={styles.actionText}>Documents</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Phases Overview */}
        <View style={styles.phasesSection}>
          <Text style={styles.sectionTitle}>Construction Phases</Text>
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
                      { backgroundColor: isCompleted ? '#10B981' : isCurrent ? '#3B82F6' : '#374151' }
                    ]}>
                      <Text style={styles.phaseIndicatorText}>
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
          <Text style={styles.sectionTitle}>Activity Timeline</Text>

          {timeline.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyIcon}>⏱️</Text>
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>
                Take a photo or add a note to start the timeline
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {timeline.map((event, index) => {
                const color = EVENT_COLORS[event.event_type] || '#6B7280';
                const icon = EVENT_ICONS[event.event_type] || '📄';
                const isLast = index === timeline.length - 1;

                return (
                  <View key={event.id} style={styles.timelineItem}>
                    {/* Spine */}
                    <View style={styles.timelineSpine}>
                      <View style={[styles.timelineDot, { backgroundColor: color }]}>
                        <Text style={styles.timelineDotIcon}>{icon}</Text>
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
    backgroundColor: '#111827',
  },
  content: {
    padding: 16,
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
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#374151',
    borderRadius: 8,
    marginRight: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  // Header Card
  headerCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
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
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  siteName: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#9CA3AF',
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
    color: '#fff',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#374151',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 5,
  },
  phaseInfo: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Actions
  actionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Phases
  phasesSection: {
    marginBottom: 20,
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  phaseChipText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  phaseChipTextCurrent: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Timeline
  timelineSection: {
    marginBottom: 20,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotIcon: {
    fontSize: 16,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#374151',
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
    color: '#fff',
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  timelineDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Empty Timeline
  emptyTimeline: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
