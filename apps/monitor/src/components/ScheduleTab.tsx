'use client'

/**
 * ScheduleTab — CRUD calendar for site agenda events.
 *
 * Monitor is the ONLY app that can CREATE events.
 * Uses @onsite/agenda for data layer, @onsite/ui/web Calendar for display.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus, CalendarDays, Loader2, X, Check,
  CloudSnow, CloudRain, Thermometer, Sun, Wind,
  Calendar as CalendarIcon, FileWarning, FileCheck,
  ClipboardList, ClipboardCheck, ClipboardX,
  Package, AlertCircle, ShoppingCart,
  UserPlus, UserMinus, Plane,
  Play, Clock, CheckCircle,
  Users, ListChecks, Bell, MoreHorizontal,
} from 'lucide-react'
import { Calendar } from '@onsite/ui/web'
import type { CalendarEvent } from '@onsite/shared'
import type { AgendaEvent, AgendaEventType, ImpactSeverity } from '@onsite/agenda'
import { fetchAgendaEvents, createAgendaEvent } from '@onsite/agenda/data'
import { AGENDA_EVENT_CONFIG, IMPACT_COLORS, EVENT_CATEGORIES } from '@onsite/agenda/constants'
import { supabase } from '@/lib/supabase'

interface ScheduleTabProps {
  siteId: string
  siteName: string
}

/** Map AgendaEvent → CalendarEvent for the Calendar component */
function toCalendarEvent(event: AgendaEvent): CalendarEvent {
  const config = AGENDA_EVENT_CONFIG[event.event_type]

  let type: CalendarEvent['type'] = 'custom'
  if (event.event_type.startsWith('inspection')) type = 'inspection'
  else if (event.event_type.startsWith('material')) type = 'delivery'
  else if (event.event_type.startsWith('phase')) type = 'milestone'
  else if (event.event_type === 'meeting') type = 'meeting'
  else if (event.event_type.startsWith('worker')) type = 'work'
  else if (event.event_type.startsWith('permit')) type = 'deadline'

  return {
    id: event.id,
    title: event.title,
    date: event.event_date,
    time: event.start_time || undefined,
    type,
    description: event.description || undefined,
    color: config?.color,
    isAllDay: !event.start_time,
    metadata: { agendaEvent: event },
  }
}

function getMonthRange(date: Date): { start: string; end: string } {
  const y = date.getFullYear()
  const m = date.getMonth()
  return {
    start: new Date(y, m, 1).toISOString().split('T')[0],
    end: new Date(y, m + 1, 0).toISOString().split('T')[0],
  }
}

export default function ScheduleTab({ siteId, siteName }: ScheduleTabProps) {
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState('all')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const range = getMonthRange(currentMonth)
    const result = await fetchAgendaEvents(supabase as never, {
      site_id: siteId,
      start_date: range.start,
      end_date: range.end,
    })
    setEvents(result.data || [])
    setLoading(false)
  }, [siteId, currentMonth])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events
    return events.filter((e) => {
      const config = AGENDA_EVENT_CONFIG[e.event_type]
      return config?.category === filter
    })
  }, [events, filter])

  const calendarEvents = useMemo(
    () => filteredEvents.map(toCalendarEvent),
    [filteredEvents],
  )

  const selectedDateStr = selectedDate?.toISOString().split('T')[0] || null
  const dayEvents = useMemo(
    () => selectedDateStr ? filteredEvents.filter((e) => e.event_date === selectedDateStr) : [],
    [filteredEvents, selectedDateStr],
  )

  const totalEvents = events.length
  const upcomingEvents = events.filter(
    (e) => e.event_date >= new Date().toISOString().split('T')[0],
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Site Schedule</h3>
          <p className="text-sm text-[#86868B]">
            {totalEvents} events &middot; {upcomingEvents} upcoming
          </p>
        </div>
        <button
          className="px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0066CC] transition-colors text-sm font-medium flex items-center gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        {EVENT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filter === cat.key
                ? 'bg-[#007AFF] text-white border-[#007AFF]'
                : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#007AFF]/50'
            }`}
            onClick={() => setFilter(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Calendar + Event Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center h-96 bg-white rounded-xl border border-[#D2D2D7]">
              <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
            </div>
          ) : (
            <Calendar
              events={calendarEvents}
              selectedDate={selectedDate || undefined}
              onDateSelect={(date) => setSelectedDate(date)}
              onMonthChange={(date) => setCurrentMonth(date)}
              highlightToday
              locale="en-CA"
            />
          )}
        </div>

        {/* Day events panel */}
        <div className="bg-white rounded-xl border border-[#D2D2D7] p-4">
          <h4 className="font-semibold text-[#1D1D1F] mb-4">
            {selectedDate
              ? selectedDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Select a date'}
          </h4>

          {selectedDate ? (
            dayEvents.length > 0 ? (
              <div className="space-y-3">
                {dayEvents.map((event) => {
                  const config = AGENDA_EVENT_CONFIG[event.event_type]
                  const impact = event.impact_severity ? IMPACT_COLORS[event.impact_severity] : null
                  return (
                    <div key={event.id} className="p-3 rounded-lg border border-[#E5E5EA] hover:border-[#007AFF]/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3 h-3 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: config?.color || '#8E8E93' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1D1D1F] text-sm truncate">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-[#86868B] mt-1 line-clamp-2">{event.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-[#8E8E93]">
                              {event.start_time || 'All day'}
                            </span>
                            {impact && (
                              <span
                                className="text-xs font-medium px-1.5 py-0.5 rounded"
                                style={{ color: impact.color, backgroundColor: impact.color + '18' }}
                              >
                                {impact.label}
                              </span>
                            )}
                            {event.verified && (
                              <span className="text-xs text-[#34C759] flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDays className="w-12 h-12 text-[#D2D2D7] mx-auto mb-3" />
                <p className="text-sm text-[#86868B]">No events on this day</p>
                <button
                  className="mt-3 text-sm text-[#007AFF] hover:underline"
                  onClick={() => setShowCreateModal(true)}
                >
                  + Add event
                </button>
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="w-12 h-12 text-[#D2D2D7] mx-auto mb-3" />
              <p className="text-sm text-[#86868B]">Click a date to view events</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-[#86868B]">
        {EVENT_CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
          <div key={cat.key} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
            <span>{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          siteId={siteId}
          defaultDate={selectedDateStr || new Date().toISOString().split('T')[0]}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            loadEvents()
          }}
        />
      )}
    </div>
  )
}

// ─── Create Event Modal ─────────────────────────────────────

const EVENT_TYPE_OPTIONS: { value: AgendaEventType; label: string; category: string }[] = [
  { value: 'inspection_scheduled', label: 'Inspection Scheduled', category: 'Inspection' },
  { value: 'inspection_passed', label: 'Inspection Passed', category: 'Inspection' },
  { value: 'inspection_failed', label: 'Inspection Failed', category: 'Inspection' },
  { value: 'material_delivery', label: 'Material Delivery', category: 'Material' },
  { value: 'material_shortage', label: 'Material Shortage', category: 'Material' },
  { value: 'material_order', label: 'Material Order', category: 'Material' },
  { value: 'weather_snow', label: 'Snow', category: 'Weather' },
  { value: 'weather_rain', label: 'Rain', category: 'Weather' },
  { value: 'weather_cold', label: 'Cold', category: 'Weather' },
  { value: 'weather_heat', label: 'Heat', category: 'Weather' },
  { value: 'weather_wind', label: 'Wind', category: 'Weather' },
  { value: 'worker_assigned', label: 'Worker Assigned', category: 'Worker' },
  { value: 'worker_absent', label: 'Worker Absent', category: 'Worker' },
  { value: 'worker_vacation', label: 'Worker Vacation', category: 'Worker' },
  { value: 'holiday', label: 'Holiday', category: 'Admin' },
  { value: 'permit_delay', label: 'Permit Delay', category: 'Admin' },
  { value: 'permit_approved', label: 'Permit Approved', category: 'Admin' },
  { value: 'meeting', label: 'Meeting', category: 'General' },
  { value: 'task', label: 'Task', category: 'General' },
  { value: 'reminder', label: 'Reminder', category: 'General' },
  { value: 'other', label: 'Other', category: 'General' },
]

const SEVERITY_OPTIONS: { value: ImpactSeverity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'minor', label: 'Minor' },
  { value: 'medium', label: 'Medium' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
]

function CreateEventModal({
  siteId,
  defaultDate,
  onClose,
  onCreated,
}: {
  siteId: string
  defaultDate: string
  onClose: () => void
  onCreated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<AgendaEventType>('task')
  const [eventDate, setEventDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<ImpactSeverity>('none')
  const [estimatedDelay, setEstimatedDelay] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()

    const result = await createAgendaEvent(supabase as never, {
      site_id: siteId,
      event_type: eventType,
      title: title.trim(),
      description: description.trim() || undefined,
      event_date: eventDate,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      source: 'manual',
      impact_severity: severity !== 'none' ? severity : undefined,
      estimated_delay_days: estimatedDelay ? parseInt(estimatedDelay, 10) : undefined,
      created_by: userData.user?.id,
    })

    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E5EA]">
          <h3 className="text-lg font-semibold text-[#1D1D1F]">New Event</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F2F2F7] transition-colors">
            <X className="w-5 h-5 text-[#8E8E93]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
              placeholder="e.g. Framing inspection"
              required
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1">Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as AgendaEventType)}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 bg-white"
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.category} — {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">Date *</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 resize-none"
              rows={3}
              placeholder="Optional details..."
            />
          </div>

          {/* Severity + Delay */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">Impact</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as ImpactSeverity)}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 bg-white"
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">Est. delay (days)</label>
              <input
                type="number"
                min="0"
                value={estimatedDelay}
                onChange={(e) => setEstimatedDelay(e.target.value)}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                placeholder="0"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#1D1D1F] rounded-lg border border-[#D2D2D7] hover:bg-[#F2F2F7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#007AFF] rounded-lg hover:bg-[#0066CC] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
