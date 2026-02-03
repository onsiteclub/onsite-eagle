/**
 * Calendar Types for OnSite Apps
 *
 * Shared calendar types used across Eagle, Timekeeper, and other apps.
 */

// Event types that can appear on the calendar
export type CalendarEventType =
  | 'milestone'      // Project milestone (e.g., phase completion)
  | 'inspection'     // Scheduled inspection
  | 'deadline'       // Hard deadline (e.g., closing date)
  | 'target'         // Soft target (e.g., internal completion goal)
  | 'work'           // Work scheduled
  | 'meeting'        // Meeting or appointment
  | 'delivery'       // Material delivery
  | 'custom'         // User-defined event

// Color scheme for event types
export const CALENDAR_EVENT_COLORS: Record<CalendarEventType, string> = {
  milestone: '#007AFF',   // Blue
  inspection: '#5856D6',  // Purple
  deadline: '#FF3B30',    // Red
  target: '#FF9500',      // Orange
  work: '#34C759',        // Green
  meeting: '#AF52DE',     // Violet
  delivery: '#00C7BE',    // Teal
  custom: '#8E8E93',      // Gray
}

// Single calendar event
export interface CalendarEvent {
  id: string
  title: string
  date: string           // ISO date string (YYYY-MM-DD)
  endDate?: string       // For multi-day events
  time?: string          // Optional time (HH:MM)
  type: CalendarEventType
  description?: string
  color?: string         // Override default color
  isAllDay?: boolean
  metadata?: Record<string, unknown>
}

// Day with events
export interface CalendarDay {
  date: Date
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected?: boolean
  events: CalendarEvent[]
}

// Calendar view modes
export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda'

// Calendar props (shared between web and native)
export interface CalendarProps {
  events: CalendarEvent[]
  selectedDate?: Date
  viewMode?: CalendarViewMode
  onDateSelect?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (date: Date) => void
  onMonthChange?: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  highlightToday?: boolean
  showWeekNumbers?: boolean
  firstDayOfWeek?: 0 | 1  // 0 = Sunday, 1 = Monday
  locale?: string
}

// Date range for fetching events
export interface CalendarDateRange {
  start: Date
  end: Date
}

// Helper to create a calendar event
export function createCalendarEvent(
  partial: Partial<CalendarEvent> & { title: string; date: string; type: CalendarEventType }
): CalendarEvent {
  return {
    id: partial.id || crypto.randomUUID(),
    title: partial.title,
    date: partial.date,
    type: partial.type,
    endDate: partial.endDate,
    time: partial.time,
    description: partial.description,
    color: partial.color || CALENDAR_EVENT_COLORS[partial.type],
    isAllDay: partial.isAllDay ?? true,
    metadata: partial.metadata,
  }
}

// Helper to get events for a specific date
export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dateStr = date.toISOString().split('T')[0]
  return events.filter(event => {
    if (event.date === dateStr) return true
    if (event.endDate) {
      return dateStr >= event.date && dateStr <= event.endDate
    }
    return false
  })
}

// Helper to generate calendar days for a month
export function generateCalendarDays(
  year: number,
  month: number,
  events: CalendarEvent[],
  firstDayOfWeek: 0 | 1 = 0
): CalendarDay[] {
  const days: CalendarDay[] = []
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Adjust for first day of week
  let startDay = firstOfMonth.getDay() - firstDayOfWeek
  if (startDay < 0) startDay += 7

  // Days from previous month
  const prevMonth = new Date(year, month, 0)
  for (let i = startDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i)
    days.push({
      date,
      dayOfMonth: date.getDate(),
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
      events: getEventsForDate(events, date),
    })
  }

  // Days of current month
  for (let day = 1; day <= lastOfMonth.getDate(); day++) {
    const date = new Date(year, month, day)
    days.push({
      date,
      dayOfMonth: day,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      events: getEventsForDate(events, date),
    })
  }

  // Days from next month to complete the grid (6 rows x 7 days = 42)
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i)
    days.push({
      date,
      dayOfMonth: i,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
      events: getEventsForDate(events, date),
    })
  }

  return days
}

// Format month name
export function formatMonthYear(date: Date, locale: string = 'en-CA'): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

// Get week day names
export function getWeekDayNames(
  locale: string = 'en-CA',
  format: 'short' | 'narrow' | 'long' = 'short',
  firstDayOfWeek: 0 | 1 = 0
): string[] {
  const days: string[] = []
  const baseDate = new Date(2024, 0, 7 + firstDayOfWeek) // A Sunday or Monday
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() + i)
    days.push(date.toLocaleDateString(locale, { weekday: format }))
  }
  return days
}
