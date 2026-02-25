/**
 * Calendar — Native (React Native) month view with event dots.
 *
 * Uses the same CalendarProps and helpers from @onsite/shared/types/calendar.
 * Mobile-optimized: compact grid, colored dots instead of event text, swipe-friendly.
 *
 * Usage:
 *   import { Calendar } from '@onsite/ui/native'
 *
 *   <Calendar
 *     events={events}
 *     onDateSelect={(date) => setSelected(date)}
 *     onEventClick={(event) => openEvent(event)}
 *   />
 */

import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@onsite/tokens';
import type { CalendarProps, CalendarEvent, CalendarDay } from '@onsite/shared';
import {
  generateCalendarDays,
  formatMonthYear,
  getWeekDayNames,
  CALENDAR_EVENT_COLORS,
} from '@onsite/shared';

/** Maximum number of event dots shown per day cell */
const MAX_DOTS = 4;

export function Calendar({
  events = [],
  selectedDate,
  onDateSelect,
  onEventClick,
  onMonthChange,
  minDate,
  maxDate,
  highlightToday = true,
  firstDayOfWeek = 0,
  locale = 'en-CA',
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => selectedDate || new Date());
  const [internalSelected, setInternalSelected] = useState<Date | undefined>(selectedDate);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = useMemo(
    () => generateCalendarDays(year, month, events, firstDayOfWeek),
    [year, month, events, firstDayOfWeek],
  );

  const weekDays = useMemo(
    () => getWeekDayNames(locale, 'narrow', firstDayOfWeek),
    [locale, firstDayOfWeek],
  );

  const goToPreviousMonth = useCallback(() => {
    const d = new Date(year, month - 1, 1);
    if (minDate && d < minDate) return;
    setCurrentDate(d);
    onMonthChange?.(d);
  }, [year, month, minDate, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    const d = new Date(year, month + 1, 1);
    if (maxDate && d > maxDate) return;
    setCurrentDate(d);
    onMonthChange?.(d);
  }, [year, month, maxDate, onMonthChange]);

  const handleDatePress = useCallback(
    (day: CalendarDay) => {
      setInternalSelected(day.date);
      onDateSelect?.(day.date);
    },
    [onDateSelect],
  );

  const isSelected = useCallback(
    (day: CalendarDay) => {
      if (!internalSelected) return false;
      return (
        day.date.getFullYear() === internalSelected.getFullYear() &&
        day.date.getMonth() === internalSelected.getMonth() &&
        day.date.getDate() === internalSelected.getDate()
      );
    },
    [internalSelected],
  );

  // Render the 6×7 grid in rows
  const rows: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* Header: < Month Year > */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton} hitSlop={8}>
          <Text style={styles.navArrow}>{'\u276E'}</Text>
        </TouchableOpacity>

        <Text style={styles.monthYear}>{formatMonthYear(currentDate, locale)}</Text>

        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton} hitSlop={8}>
          <Text style={styles.navArrow}>{'\u276F'}</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekRow}>
        {weekDays.map((wd, i) => (
          <View key={i} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{wd}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.dayRow}>
          {row.map((day, ci) => {
            const sel = isSelected(day);
            const today = day.isToday && highlightToday;

            return (
              <TouchableOpacity
                key={ci}
                style={styles.dayCell}
                onPress={() => handleDatePress(day)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.dayCircle,
                    today && !sel && styles.todayCircle,
                    sel && styles.selectedCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !day.isCurrentMonth && styles.outsideMonthText,
                      (today || sel) && styles.highlightedDayText,
                    ]}
                  >
                    {day.dayOfMonth}
                  </Text>
                </View>

                {/* Event dots */}
                {day.events.length > 0 && (
                  <View style={styles.dotsRow}>
                    {day.events.slice(0, MAX_DOTS).map((event) => (
                      <View
                        key={event.id}
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              event.color || CALENDAR_EVENT_COLORS[event.type] || colors.accent,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Selected day events list */}
      {internalSelected && onEventClick && (
        <SelectedDayEvents
          days={days}
          selected={internalSelected}
          onEventClick={onEventClick}
        />
      )}
    </View>
  );
}

/** Displays events for the selected day below the grid */
function SelectedDayEvents({
  days,
  selected,
  onEventClick,
}: {
  days: CalendarDay[];
  selected: Date;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const dayData = days.find(
    (d) =>
      d.date.getFullYear() === selected.getFullYear() &&
      d.date.getMonth() === selected.getMonth() &&
      d.date.getDate() === selected.getDate(),
  );

  if (!dayData || dayData.events.length === 0) return null;

  return (
    <View style={styles.eventsList}>
      {dayData.events.map((event) => (
        <TouchableOpacity
          key={event.id}
          style={styles.eventRow}
          onPress={() => onEventClick(event)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.eventDot,
              {
                backgroundColor:
                  event.color || CALENDAR_EVENT_COLORS[event.type] || colors.accent,
              },
            ]}
          />
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {event.title}
            </Text>
            {event.time && <Text style={styles.eventTime}>{event.time}</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontSize: 18,
    color: colors.text,
  },
  monthYear: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },

  // Week day labels
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },

  // Day grid
  dayRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 48,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: colors.accentSoft,
  },
  selectedCircle: {
    backgroundColor: colors.accent,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  outsideMonthText: {
    color: colors.iconMuted,
  },
  highlightedDayText: {
    color: colors.white,
  },

  // Event dots
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // Events list for selected day
  eventsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
  },
});

export default Calendar;
