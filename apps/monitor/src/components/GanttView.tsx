'use client'

/**
 * GanttView — Visual schedule: houses as rows, phases as bars.
 *
 * Reads from egl_schedules + egl_schedule_phases to display
 * a Gantt-style chart of construction progress.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { addDays, differenceInDays, format, startOfWeek, endOfWeek, isBefore, isAfter, isWithinInterval } from 'date-fns'

interface GanttViewProps {
  siteId: string
  siteName: string
}

interface SchedulePhase {
  id: string
  schedule_id: string
  phase_id: string
  expected_start_date: string | null
  expected_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  status: string
}

interface HouseSchedule {
  id: string
  house_id: string
  lot_number: string
  house_status: string
  status: string
  expected_start_date: string | null
  expected_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  deviation_days: number | null
  assigned_worker_name: string | null
  phases: SchedulePhase[]
}

interface PhaseRef {
  id: string
  name: string
  order_index: number
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#8E8E93',
  in_progress: '#FF9500',
  on_track: '#34C759',
  at_risk: '#FF9500',
  delayed: '#FF3B30',
  completed: '#34C759',
  on_hold: '#AF52DE',
  pending: '#D1D1D6',
  blocked: '#FF3B30',
  inspection: '#007AFF',
  skipped: '#8E8E93',
}

const PHASE_STATUS_COLORS: Record<string, string> = {
  pending: '#D1D1D6',
  in_progress: '#007AFF',
  blocked: '#FF3B30',
  inspection: '#FF9500',
  completed: '#34C759',
  skipped: '#8E8E93',
}

export default function GanttView({ siteId, siteName }: GanttViewProps) {
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<HouseSchedule[]>([])
  const [phases, setPhases] = useState<PhaseRef[]>([])
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date()))
  const [weeksVisible, setWeeksVisible] = useState(8)

  const viewEnd = useMemo(() => addDays(viewStart, weeksVisible * 7), [viewStart, weeksVisible])

  const days = useMemo(() => {
    const result: Date[] = []
    let current = new Date(viewStart)
    while (isBefore(current, viewEnd)) {
      result.push(new Date(current))
      current = addDays(current, 1)
    }
    return result
  }, [viewStart, viewEnd])

  const weeks = useMemo(() => {
    const result: { start: Date; end: Date; label: string }[] = []
    let current = new Date(viewStart)
    while (isBefore(current, viewEnd)) {
      const weekEnd = endOfWeek(current)
      result.push({
        start: new Date(current),
        end: weekEnd,
        label: format(current, 'MMM d'),
      })
      current = addDays(weekEnd, 1)
    }
    return result
  }, [viewStart, viewEnd])

  const loadData = useCallback(async () => {
    setLoading(true)

    // Load phase reference
    const { data: phaseRefs } = await supabase
      .from('ref_eagle_phases')
      .select('id, name, order_index')
      .order('order_index', { ascending: true })

    setPhases((phaseRefs || []) as PhaseRef[])

    // Load schedules with house info
    const { data: schedulesData } = await supabase
      .from('egl_schedules')
      .select(`
        id, house_id, status,
        expected_start_date, expected_end_date,
        actual_start_date, actual_end_date,
        deviation_days, assigned_worker_name
      `)
      .eq('site_id', siteId)

    if (!schedulesData?.length) {
      setSchedules([])
      setLoading(false)
      return
    }

    // Load houses for lot numbers
    const houseIds = schedulesData.map((s: { house_id: string }) => s.house_id)
    const { data: housesData } = await supabase
      .from('egl_houses')
      .select('id, lot_number, status')
      .in('id', houseIds)

    const houseMap = new Map(
      (housesData || []).map((h: { id: string; lot_number: string; status: string }) => [h.id, h])
    )

    // Load schedule phases
    const scheduleIds = schedulesData.map((s: { id: string }) => s.id)
    const { data: phasesData } = await supabase
      .from('egl_schedule_phases')
      .select('id, schedule_id, phase_id, expected_start_date, expected_end_date, actual_start_date, actual_end_date, status')
      .in('schedule_id', scheduleIds)

    const phasesBySchedule = new Map<string, SchedulePhase[]>()
    for (const p of (phasesData || []) as SchedulePhase[]) {
      const existing = phasesBySchedule.get(p.schedule_id) || []
      existing.push(p)
      phasesBySchedule.set(p.schedule_id, existing)
    }

    const result: HouseSchedule[] = schedulesData
      .map((s: {
        id: string; house_id: string; status: string;
        expected_start_date: string | null; expected_end_date: string | null;
        actual_start_date: string | null; actual_end_date: string | null;
        deviation_days: number | null; assigned_worker_name: string | null
      }) => {
        const house = houseMap.get(s.house_id) as { lot_number: string; status: string } | undefined
        return {
          ...s,
          lot_number: house?.lot_number || '?',
          house_status: house?.status || 'unknown',
          phases: phasesBySchedule.get(s.id) || [],
        }
      })
      .sort((a: HouseSchedule, b: HouseSchedule) => a.lot_number.localeCompare(b.lot_number, undefined, { numeric: true }))

    setSchedules(result)
    setLoading(false)
  }, [siteId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const navigateWeeks = (direction: number) => {
    setViewStart(prev => addDays(prev, direction * 7))
  }

  const totalDays = days.length
  const dayWidth = 100 / totalDays

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-[#8E8E93] mx-auto mb-4" />
        <p className="text-lg font-semibold text-[#1D1D1F]">No schedules found</p>
        <p className="text-sm text-[#8E8E93] mt-1">
          Create schedules for houses to see the Gantt chart.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1F]">Schedule Overview</h2>
          <p className="text-sm text-[#8E8E93]">{schedules.length} houses scheduled</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeeks(-1)}
            className="p-2 rounded-lg hover:bg-[#F2F2F7] transition"
          >
            <ChevronLeft className="w-5 h-5 text-[#3C3C43]" />
          </button>
          <button
            onClick={() => setViewStart(startOfWeek(new Date()))}
            className="px-3 py-1.5 text-sm font-medium text-[#007AFF] hover:bg-[#F2F2F7] rounded-lg transition"
          >
            Today
          </button>
          <button
            onClick={() => navigateWeeks(1)}
            className="p-2 rounded-lg hover:bg-[#F2F2F7] transition"
          >
            <ChevronRight className="w-5 h-5 text-[#3C3C43]" />
          </button>
          <select
            value={weeksVisible}
            onChange={(e) => setWeeksVisible(Number(e.target.value))}
            className="ml-2 text-sm border border-[#D2D2D7] rounded-lg px-2 py-1.5"
          >
            <option value={4}>4 weeks</option>
            <option value={8}>8 weeks</option>
            <option value={12}>12 weeks</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        {[
          { label: 'On Track', color: '#34C759' },
          { label: 'In Progress', color: '#007AFF' },
          { label: 'At Risk', color: '#FF9500' },
          { label: 'Delayed', color: '#FF3B30' },
          { label: 'Completed', color: '#34C759' },
          { label: 'Pending', color: '#D1D1D6' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-[#8E8E93]">{label}</span>
          </div>
        ))}
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-hidden">
        {/* Week Headers */}
        <div className="flex border-b border-[#D2D2D7]">
          <div className="w-48 min-w-48 flex-shrink-0 border-r border-[#D2D2D7] px-3 py-2 bg-[#F9F9FB]">
            <span className="text-xs font-semibold text-[#8E8E93] uppercase">House</span>
          </div>
          <div className="flex-1 flex">
            {weeks.map((week, i) => (
              <div
                key={i}
                className="flex-1 border-r border-[#E5E5EA] px-2 py-2 bg-[#F9F9FB] text-center"
              >
                <span className="text-xs font-medium text-[#3C3C43]">{week.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {schedules.map((schedule) => (
          <div key={schedule.id} className="flex border-b border-[#E5E5EA] hover:bg-[#F9F9FB] transition group">
            {/* House Label */}
            <div className="w-48 min-w-48 flex-shrink-0 border-r border-[#E5E5EA] px-3 py-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[schedule.status] || '#8E8E93' }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#1D1D1F] truncate">
                    Lot {schedule.lot_number}
                  </div>
                  {schedule.assigned_worker_name && (
                    <div className="text-xs text-[#8E8E93] truncate">
                      {schedule.assigned_worker_name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bar Area */}
            <div className="flex-1 relative" style={{ minHeight: 44 }}>
              {schedule.phases.map((phase) => {
                const startDate = phase.actual_start_date || phase.expected_start_date
                const endDate = phase.actual_end_date || phase.expected_end_date
                if (!startDate || !endDate) return null

                const phaseStart = new Date(startDate)
                const phaseEnd = new Date(endDate)

                // Calculate position as percentage of visible range
                const totalRange = differenceInDays(viewEnd, viewStart)
                const leftOffset = differenceInDays(phaseStart, viewStart)
                const width = differenceInDays(phaseEnd, phaseStart) + 1

                // Skip if completely out of view
                if (leftOffset + width < 0 || leftOffset > totalRange) return null

                const leftPct = Math.max(0, (leftOffset / totalRange) * 100)
                const widthPct = Math.min(
                  100 - leftPct,
                  (Math.min(width, totalRange - Math.max(0, leftOffset)) / totalRange) * 100,
                )

                const phaseRef = phases.find((p) => p.id === phase.phase_id)
                const barColor = PHASE_STATUS_COLORS[phase.status] || '#D1D1D6'

                return (
                  <div
                    key={phase.id}
                    className="absolute top-2 h-6 rounded-md cursor-pointer group/bar"
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 1)}%`,
                      backgroundColor: barColor,
                      opacity: phase.status === 'completed' ? 0.8 : 1,
                    }}
                    title={`${phaseRef?.name || 'Phase'}: ${phase.status} (${format(phaseStart, 'MMM d')} - ${format(phaseEnd, 'MMM d')})`}
                  >
                    {widthPct > 8 && (
                      <span className="text-[10px] text-white font-medium px-1 truncate block leading-6">
                        {phaseRef?.name || ''}
                      </span>
                    )}
                  </div>
                )
              })}

              {/* Today marker */}
              {isWithinInterval(new Date(), { start: viewStart, end: viewEnd }) && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-[#FF3B30] z-10"
                  style={{
                    left: `${(differenceInDays(new Date(), viewStart) / differenceInDays(viewEnd, viewStart)) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'On Track', count: schedules.filter(s => s.status === 'on_track' || s.status === 'in_progress').length, color: '#34C759' },
          { label: 'At Risk', count: schedules.filter(s => s.status === 'at_risk').length, color: '#FF9500' },
          { label: 'Delayed', count: schedules.filter(s => s.status === 'delayed').length, color: '#FF3B30' },
          { label: 'Completed', count: schedules.filter(s => s.status === 'completed').length, color: '#007AFF' },
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#D2D2D7] p-4">
            <div className="text-2xl font-bold" style={{ color }}>{count}</div>
            <div className="text-sm text-[#8E8E93]">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
