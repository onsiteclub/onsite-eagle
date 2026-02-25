/**
 * DayEvents — List of events for a selected day.
 *
 * Shown below the Calendar when a date is tapped.
 * Read-only for workers.
 */

import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@onsite/tokens';
import type { AgendaEvent } from '@onsite/agenda';
import { AGENDA_EVENT_CONFIG, IMPACT_COLORS } from '@onsite/agenda';

interface DayEventsProps {
  date: string;
  events: AgendaEvent[];
}

export function DayEvents({ date, events }: DayEventsProps) {
  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="calendar-outline" size={28} color={colors.iconMuted} />
        <Text style={styles.emptyText}>No events on this day</Text>
      </View>
    );
  }

  const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.dateHeader}>{formatted}</Text>
      <Text style={styles.countLabel}>{events.length} event{events.length !== 1 ? 's' : ''}</Text>

      {events.map((event) => {
        const config = AGENDA_EVENT_CONFIG[event.event_type];
        const impact = event.impact_severity ? IMPACT_COLORS[event.impact_severity] : null;

        return (
          <View key={event.id} style={styles.card}>
            {/* Left color bar */}
            <View style={[styles.colorBar, { backgroundColor: config?.color || colors.accent }]} />

            <View style={styles.cardContent}>
              {/* Header row: icon + title */}
              <View style={styles.headerRow}>
                <Ionicons
                  name={(config?.icon || 'ellipsis-horizontal') as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={config?.color || colors.accent}
                />
                <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
              </View>

              {/* Description */}
              {event.description ? (
                <Text style={styles.description} numberOfLines={2}>{event.description}</Text>
              ) : null}

              {/* Meta row: time + severity badge */}
              <View style={styles.metaRow}>
                {event.start_time ? (
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.timeText}>
                      {event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.allDayLabel}>All day</Text>
                )}

                {impact ? (
                  <View style={[styles.severityBadge, { backgroundColor: impact.color + '18' }]}>
                    <Text style={[styles.severityText, { color: impact.color }]}>
                      {impact.label}
                    </Text>
                  </View>
                ) : null}

                {event.estimated_delay_days ? (
                  <Text style={styles.delayText}>
                    +{event.estimated_delay_days}d delay
                  </Text>
                ) : null}
              </View>

              {/* Source + verified */}
              <View style={styles.footerRow}>
                <Text style={styles.sourceText}>{event.source}</Text>
                {event.verified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#34C759" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  countLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  allDayLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  delayText: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceText: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500',
  },
});
