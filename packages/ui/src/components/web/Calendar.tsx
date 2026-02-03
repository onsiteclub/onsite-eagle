'use client'

import { useState, useMemo } from 'react'
import type {
  CalendarProps,
  CalendarEvent,
  CalendarDay,
} from '@onsite/shared'
import {
  generateCalendarDays,
  formatMonthYear,
  getWeekDayNames,
  CALENDAR_EVENT_COLORS,
} from '@onsite/shared'

/**
 * Calendar component for web (React/Next.js)
 *
 * Usage:
 * import { Calendar } from '@onsite/ui/web'
 *
 * <Calendar
 *   events={events}
 *   onDateSelect={(date) => console.log(date)}
 *   onEventClick={(event) => console.log(event)}
 * />
 */
export function Calendar({
  events = [],
  selectedDate,
  viewMode = 'month',
  onDateSelect,
  onEventClick,
  onEventCreate,
  onMonthChange,
  minDate,
  maxDate,
  highlightToday = true,
  showWeekNumbers = false,
  firstDayOfWeek = 0,
  locale = 'en-CA',
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => selectedDate || new Date())
  const [internalSelected, setInternalSelected] = useState<Date | undefined>(selectedDate)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Generate calendar days
  const days = useMemo(() => {
    return generateCalendarDays(year, month, events, firstDayOfWeek)
  }, [year, month, events, firstDayOfWeek])

  // Week day names
  const weekDays = useMemo(() => {
    return getWeekDayNames(locale, 'short', firstDayOfWeek)
  }, [locale, firstDayOfWeek])

  // Navigation handlers
  const goToPreviousMonth = () => {
    const newDate = new Date(year, month - 1, 1)
    if (minDate && newDate < minDate) return
    setCurrentDate(newDate)
    onMonthChange?.(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(year, month + 1, 1)
    if (maxDate && newDate > maxDate) return
    setCurrentDate(newDate)
    onMonthChange?.(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    onMonthChange?.(today)
  }

  // Date selection
  const handleDateClick = (day: CalendarDay) => {
    setInternalSelected(day.date)
    onDateSelect?.(day.date)
  }

  // Event click
  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    onEventClick?.(event)
  }

  // Check if date is selected
  const isSelected = (day: CalendarDay) => {
    if (!internalSelected) return false
    return (
      day.date.getFullYear() === internalSelected.getFullYear() &&
      day.date.getMonth() === internalSelected.getMonth() &&
      day.date.getDate() === internalSelected.getDate()
    )
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #D2D2D7',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #D2D2D7',
        backgroundColor: '#F5F5F7',
      }}>
        <button
          onClick={goToPreviousMonth}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#1D1D1F',
          }}
          aria-label="Previous month"
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1D1D1F', margin: 0 }}>
            {formatMonthYear(currentDate, locale)}
          </h2>
          <button
            onClick={goToToday}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#007AFF',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Today
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#1D1D1F',
          }}
          aria-label="Next month"
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Week day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: '1px solid #D2D2D7',
      }}>
        {weekDays.map((day, i) => (
          <div
            key={i}
            style={{
              padding: '8px 0',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: '#8E8E93',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
      }}>
        {days.map((day, i) => {
          const selected = isSelected(day)
          const isLastRow = i >= 35
          const isLastCol = i % 7 === 6

          return (
            <button
              key={i}
              onClick={() => handleDateClick(day)}
              onDoubleClick={() => onEventCreate?.(day.date)}
              style={{
                minHeight: '80px',
                padding: '8px',
                borderBottom: isLastRow ? 'none' : '1px solid #E5E5EA',
                borderRight: isLastCol ? 'none' : '1px solid #E5E5EA',
                backgroundColor: selected
                  ? 'rgba(0, 122, 255, 0.1)'
                  : day.isCurrentMonth
                  ? 'white'
                  : '#F5F5F7',
                textAlign: 'left',
                verticalAlign: 'top',
                border: 'none',
                borderBottomStyle: isLastRow ? 'none' : 'solid',
                borderBottomWidth: isLastRow ? 0 : '1px',
                borderBottomColor: '#E5E5EA',
                borderRightStyle: isLastCol ? 'none' : 'solid',
                borderRightWidth: isLastCol ? 0 : '1px',
                borderRightColor: '#E5E5EA',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Day number */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: (day.isToday && highlightToday) || selected
                    ? '#007AFF'
                    : 'transparent',
                  color: (day.isToday && highlightToday) || selected
                    ? 'white'
                    : day.isCurrentMonth
                    ? '#1D1D1F'
                    : '#8E8E93',
                }}
              >
                {day.dayOfMonth}
              </span>

              {/* Event list (show first 2) */}
              {day.events.length > 0 && (
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {day.events.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        backgroundColor: (event.color || CALENDAR_EVENT_COLORS[event.type]) + '20',
                        color: event.color || CALENDAR_EVENT_COLORS[event.type],
                        cursor: 'pointer',
                      }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {day.events.length > 2 && (
                    <p style={{ fontSize: '10px', color: '#8E8E93', padding: '0 4px', margin: 0 }}>
                      +{day.events.length - 2} more
                    </p>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Calendar
