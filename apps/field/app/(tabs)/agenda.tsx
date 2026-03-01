/**
 * Agenda — Site-level calendar events for the worker
 *
 * Uses @onsite/agenda: fetchAgendaEvents, buildDaySummaries, AGENDA_EVENT_CONFIG, IMPACT_COLORS.
 * Enterprise v3 light theme.
 */

import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfDay } from 'date-fns';
import { useAuth } from '@onsite/auth';
import { fetchAgendaEvents, AGENDA_EVENT_CONFIG, IMPACT_COLORS } from '@onsite/agenda';
import type { AgendaEvent, ImpactSeverity } from '@onsite/agenda';
import { supabase } from '../../src/lib/supabase';

const ACCENT = '#0F766E';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  weather_snow: 'snow',
  weather_rain: 'rainy',
  weather_cold: 'thermometer',
  weather_heat: 'sunny',
  weather_wind: 'leaf',
  holiday: 'calendar',
  permit_delay: 'document-lock',
  permit_approved: 'checkmark-circle',
  inspection_scheduled: 'search',
  inspection_passed: 'checkmark-done',
  inspection_failed: 'close-circle',
  inspection_cancelled: 'ban',
  material_delivery: 'cube',
  material_shortage: 'alert-circle',
  material_order: 'cart',
  worker_assigned: 'person-add',
  worker_absent: 'person-remove',
  worker_vacation: 'airplane',
  phase_start: 'play-circle',
  phase_deadline: 'alarm',
  phase_completed: 'checkmark-circle',
  meeting: 'people',
  task: 'checkbox',
  reminder: 'notifications',
  other: 'ellipsis-horizontal-circle',
};

export default function AgendaScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadSiteAndEvents();
  }, [user]);

  async function loadSiteAndEvents() {
    try {
      // Get user's first jobsite via org membership -> frm_jobsites
      const { data: sites } = await supabase
        .from('frm_jobsites')
        .select('id')
        .limit(1);

      if (!sites || sites.length === 0) {
        setLoading(false);
        return;
      }

      const site = sites[0];
      setSiteId(site.id);

      await loadEvents(site.id);
    } catch (error) {
      console.error('Error loading agenda:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(site_id: string) {
    const today = startOfDay(new Date());
    const endDate = addDays(today, 30);

    const { data, error } = await fetchAgendaEvents(supabase as never, {
      site_id,
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
    });

    if (!error && data) {
      setEvents(data);
    }
  }

  const onRefresh = useCallback(async () => {
    if (!siteId) return;
    setRefreshing(true);
    await loadEvents(siteId);
    setRefreshing(false);
  }, [siteId]);

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = event.event_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, AgendaEvent[]>);

  const sortedDates = Object.keys(groupedEvents).sort();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading agenda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
        <Text style={styles.headerSubtitle}>
          Next 30 days{events.length > 0 ? ` \u2022 ${events.length} events` : ''}
        </Text>
      </View>

      <FlatList
        data={sortedDates}
        keyExtractor={(date) => date}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
        renderItem={({ item: date }) => {
          const dayEvents = groupedEvents[date];
          const dateObj = new Date(date + 'T00:00:00');
          const isToday = format(new Date(), 'yyyy-MM-dd') === date;

          return (
            <View style={styles.daySection}>
              {/* Date Header */}
              <View style={styles.dateHeader}>
                <View style={[styles.dateBadge, isToday && styles.dateBadgeToday]}>
                  <Text style={[styles.dateDay, isToday && styles.dateDayToday]}>
                    {format(dateObj, 'd')}
                  </Text>
                  <Text style={[styles.dateMonth, isToday && styles.dateMonthToday]}>
                    {format(dateObj, 'MMM')}
                  </Text>
                </View>
                <View style={styles.dateInfo}>
                  <Text style={styles.dateName}>
                    {isToday ? 'Today' : format(dateObj, 'EEEE')}
                  </Text>
                  <Text style={styles.dateCount}>
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Events */}
              {dayEvents.map((event) => {
                const config = AGENDA_EVENT_CONFIG[event.event_type] || AGENDA_EVENT_CONFIG.other;
                const iconName = ICON_MAP[event.event_type] || 'ellipsis-horizontal-circle';
                const impactConfig = event.impact_severity
                  ? IMPACT_COLORS[event.impact_severity as ImpactSeverity]
                  : null;

                return (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={[styles.eventIconBg, { backgroundColor: `${config.color}20` }]}>
                      <Ionicons name={iconName} size={20} color={config.color} />
                    </View>
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      {event.description && (
                        <Text style={styles.eventDesc} numberOfLines={2}>
                          {event.description}
                        </Text>
                      )}
                      <View style={styles.eventMeta}>
                        {event.start_time && (
                          <Text style={styles.eventTime}>
                            {event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}
                          </Text>
                        )}
                        {impactConfig && (
                          <View style={[styles.impactBadge, { backgroundColor: `${impactConfig.color}20` }]}>
                            <Text style={[styles.impactText, { color: impactConfig.color }]}>
                              {impactConfig.label}
                            </Text>
                          </View>
                        )}
                        {event.estimated_delay_days != null && event.estimated_delay_days > 0 && (
                          <Text style={styles.delayText}>
                            +{event.estimated_delay_days}d delay
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Upcoming Events</Text>
            <Text style={styles.emptyText}>
              Weather alerts, inspections, and deadlines will appear here
            </Text>
          </View>
        }
      />
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Day Section
  daySection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBadgeToday: {
    backgroundColor: ACCENT,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#101828',
    lineHeight: 20,
  },
  dateDayToday: {
    color: '#FFFFFF',
  },
  dateMonth: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  dateMonthToday: {
    color: 'rgba(255,255,255,0.8)',
  },
  dateInfo: {
    flex: 1,
  },
  dateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101828',
  },
  dateCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Event Card
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  eventIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101828',
    marginBottom: 2,
  },
  eventDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  eventTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
  },
  delayText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  // Empty
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
