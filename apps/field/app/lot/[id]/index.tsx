/**
 * Lot Detail — House detail with progress, quick actions, activity
 *
 * Queries egl_houses, egl_sites, egl_timeline.
 * Enterprise v3 light theme.
 */

import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase } from '../../../src/lib/supabase';

interface House {
  id: string;
  lot_number: string;
  address: string | null;
  status: string;
  current_phase: number;
  progress_percentage: number;
  site_id: string;
  site: { id: string; name: string } | null;
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

const EVENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  photo: 'camera',
  alert: 'warning',
  note: 'document-text',
  ai_validation: 'checkmark-circle',
  status_change: 'swap-horizontal',
  issue: 'alert-circle',
  inspection: 'search',
  document: 'document',
  assignment: 'person',
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

const ACCENT = '#0F766E';

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [house, setHouse] = useState<House | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadLotData();
  }, [id]);

  async function loadLotData() {
    try {
      const { data: houseData } = await supabase
        .from('egl_houses')
        .select(`
          id, lot_number, address, status,
          current_phase, progress_percentage, site_id,
          site:egl_sites ( id, name )
        `)
        .eq('id', id)
        .single();

      if (houseData) {
        const normalized = {
          ...houseData,
          site: Array.isArray(houseData.site) ? houseData.site[0] : houseData.site,
        } as House;
        setHouse(normalized);
      }

      const { data: timelineData } = await supabase
        .from('egl_timeline')
        .select('*')
        .eq('house_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (timelineData) setTimeline(timelineData);
    } catch (error) {
      console.error('Error loading lot:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading lot details...</Text>
      </View>
    );
  }

  if (!house) {
    return (
      <View style={styles.centered}>
        <Ionicons name="home-outline" size={64} color="#D1D5DB" />
        <Text style={styles.errorText}>Lot not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[house.status] || STATUS_COLORS.not_started;

  return (
    <>
      <Stack.Screen options={{ title: `Lot ${house.lot_number}` }} />

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

          <Text style={styles.siteName}>{house.site?.name || 'Unknown Site'}</Text>
          {house.address && <Text style={styles.address}>{house.address}</Text>}

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.phaseLabel}>Phase {house.current_phase} of 7</Text>
              <Text style={styles.progressPercent}>{house.progress_percentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${house.progress_percentage}%` }]} />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/camera?houseId=${house.id}&phaseId=${house.current_phase}`)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="camera" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.actionText}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/lot/${id}/notes`)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="document-text" size={22} color="#10B981" />
              </View>
              <Text style={styles.actionText}>Note</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/lot/${id}/timeline`)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="chatbubbles" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.actionText}>Timeline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/lot/${id}/documents`)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="folder-open" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.actionText}>Docs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Phases Carousel */}
        <View style={styles.phasesSection}>
          <Text style={styles.sectionTitle}>Construction Phases</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.phasesRow}>
              {Array.from({ length: 7 }, (_, i) => {
                const phaseNumber = i + 1;
                const isCompleted = phaseNumber < house.current_phase;
                const isCurrent = phaseNumber === house.current_phase;

                return (
                  <View key={i} style={styles.phaseChip}>
                    <View style={[
                      styles.phaseIndicator,
                      {
                        backgroundColor: isCompleted ? '#10B981' : isCurrent ? ACCENT : '#E5E7EB',
                      }
                    ]}>
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      ) : (
                        <Text style={[
                          styles.phaseIndicatorText,
                          { color: isCurrent ? '#fff' : '#6B7280' }
                        ]}>
                          {phaseNumber}
                        </Text>
                      )}
                    </View>
                    <Text style={[
                      styles.phaseChipText,
                      isCurrent && { color: ACCENT, fontWeight: '600' }
                    ]} numberOfLines={1}>
                      Phase {phaseNumber}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Recent Activity */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {timeline.length > 0 && (
              <TouchableOpacity onPress={() => router.push(`/lot/${id}/timeline`)}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {timeline.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Ionicons name="time-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>
                Take a photo or add a note to start the timeline
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {timeline.slice(0, 5).map((event, index) => {
                const color = EVENT_COLORS[event.event_type] || '#6B7280';
                const iconName = EVENT_ICONS[event.event_type] || 'document';
                const isLast = index === Math.min(timeline.length, 5) - 1;

                return (
                  <View key={event.id} style={styles.timelineItem}>
                    <View style={styles.timelineSpine}>
                      <View style={[styles.timelineDot, { backgroundColor: color }]}>
                        <Ionicons name={iconName} size={14} color="#fff" />
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{event.title}</Text>
                      {event.description && (
                        <Text style={styles.timelineDesc} numberOfLines={2}>
                          {event.description}
                        </Text>
                      )}
                      <Text style={styles.timelineDate}>
                        {format(new Date(event.created_at), 'MMM d, yyyy \u2022 h:mm a')}
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
    backgroundColor: '#F6F7F9',
  },
  content: {
    padding: 16,
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
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Header Card
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    color: '#101828',
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
    color: ACCENT,
    fontWeight: '500',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#6B7280',
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
  phaseLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressPercent: {
    fontSize: 18,
    color: ACCENT,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 5,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#101828',
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
    fontSize: 14,
    fontWeight: '600',
  },
  phaseChipText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Timeline
  timelineSection: {
    marginBottom: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
  },
  timeline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineSpine: {
    alignItems: 'center',
    width: 44,
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
    backgroundColor: '#E5E7EB',
    minHeight: 32,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  timelineDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Empty
  emptyTimeline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#101828',
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
