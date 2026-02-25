/**
 * AgendaView — Calendar month view with site events.
 *
 * Worker sees site agenda READ-ONLY.
 * Calendar from @onsite/ui/native, events from @onsite/agenda/data.
 * AgendaEvent → CalendarEvent bridge for rendering.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@onsite/tokens';
import { Calendar } from '@onsite/ui/native';
import type { CalendarEvent, CalendarEventType } from '@onsite/shared';
import type { AgendaEvent } from '@onsite/agenda';
import { fetchAgendaEvents, AGENDA_EVENT_CONFIG } from '@onsite/agenda';
import { supabase } from '../../lib/supabase';
import { DayEvents } from './DayEvents';

/** Map agenda event types to CalendarEventType for rendering */
function mapEventType(agendaType: string): CalendarEventType {
  if (agendaType.startsWith('inspection')) return 'inspection';
  if (agendaType.startsWith('material')) return 'delivery';
  if (agendaType.startsWith('weather')) return 'custom';
  if (agendaType.startsWith('phase')) return 'milestone';
  if (agendaType === 'meeting') return 'meeting';
  if (agendaType === 'holiday') return 'custom';
  if (agendaType.startsWith('worker')) return 'work';
  if (agendaType.startsWith('permit')) return 'deadline';
  return 'custom';
}

/** Convert AgendaEvent → CalendarEvent for the Calendar component */
function toCalendarEvent(event: AgendaEvent): CalendarEvent {
  const config = AGENDA_EVENT_CONFIG[event.event_type];
  return {
    id: event.id,
    title: event.title,
    date: event.event_date,
    time: event.start_time || undefined,
    type: mapEventType(event.event_type),
    description: event.description || undefined,
    color: config?.color,
    isAllDay: !event.start_time,
    metadata: { agendaEvent: event },
  };
}

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

function getMonthRange(date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function AgendaView() {
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Resolve site
  useEffect(() => {
    resolveWorkerSiteId().then((id) => {
      setSiteId(id);
      if (!id) setLoading(false);
    });
  }, []);

  // Fetch events for current month
  const fetchEvents = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    const range = getMonthRange(currentMonth);
    const result = await fetchAgendaEvents(supabase as never, {
      site_id: siteId,
      start_date: range.start,
      end_date: range.end,
    });
    setEvents(result.data || []);
    setLoading(false);
  }, [siteId, currentMonth]);

  useEffect(() => {
    if (siteId) fetchEvents();
  }, [siteId, fetchEvents]);

  const calendarEvents = useMemo(
    () => events.map(toCalendarEvent),
    [events],
  );

  const selectedDateStr = useMemo(
    () => selectedDate.toISOString().split('T')[0],
    [selectedDate],
  );

  const dayEvents = useMemo(
    () => events.filter((e) => e.event_date === selectedDateStr),
    [events, selectedDateStr],
  );

  const handleMonthChange = useCallback((date: Date) => {
    setCurrentMonth(date);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  if (!siteId && !loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No site assigned</Text>
        <Text style={styles.emptyText}>
          Link this worker to a jobsite in Monitor to see the site agenda.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loading && events.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <>
          <Calendar
            events={calendarEvents}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onMonthChange={handleMonthChange}
          />

          <DayEvents
            date={selectedDateStr}
            events={dayEvents}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
});
