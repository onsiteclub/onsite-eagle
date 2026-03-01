'use client'

/**
 * Hours Sheet — Worker hours per day, integrated with Timekeeper.
 * Data from tmk_entries + tmk_geofences (linked to site via jobsite_id).
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, Download, AlertTriangle,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface HoursSheetProps {
  siteId: string
  siteName: string
}

interface WorkerHours {
  worker_id: string
  worker_code: string | null
  full_name: string
  daily: Record<string, number>
  total: number
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function fmtDate(d: Date) {
  return d.toISOString().split('T')[0]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HoursSheet({ siteId, siteName }: HoursSheetProps) {
  const now = new Date()
  const [loading, setLoading] = useState(true)
  const [workers, setWorkers] = useState<WorkerHours[]>([])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const days = useMemo(() => getMonthDays(year, month), [year, month])

  const monthLabel = new Date(year, month).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
  })

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: geofences } = await supabase
      .from('tmk_geofences')
      .select('id')
      .eq('jobsite_id', siteId)

    if (!geofences?.length) {
      setWorkers([])
      setLoading(false)
      return
    }

    const geoIds = geofences.map(g => g.id)

    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endMonth = month === 11 ? 0 : month + 1
    const endYear = month === 11 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`

    const { data: entries } = await supabase
      .from('tmk_entries')
      .select('user_id, entry_at, duration_minutes')
      .in('geofence_id', geoIds)
      .gte('entry_at', startDate)
      .lt('entry_at', endDate)
      .not('duration_minutes', 'is', null)

    if (!entries?.length) {
      setWorkers([])
      setLoading(false)
      return
    }

    const workerIds = [...new Set(entries.map(e => e.user_id))]

    const { data: profiles } = await supabase
      .from('core_profiles')
      .select('id, full_name, worker_code')
      .in('id', workerIds)

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    )

    const byWorker = new Map<string, Record<string, number>>()
    for (const e of entries) {
      if (!byWorker.has(e.user_id)) byWorker.set(e.user_id, {})
      const daily = byWorker.get(e.user_id)!
      const day = e.entry_at.split('T')[0]
      daily[day] = (daily[day] || 0) + (e.duration_minutes / 60)
    }

    const rows: WorkerHours[] = Array.from(byWorker.entries()).map(([uid, daily]) => {
      const profile = profileMap.get(uid)
      const total = Object.values(daily).reduce((s, h) => s + h, 0)
      return {
        worker_id: uid,
        worker_code: profile?.worker_code || null,
        full_name: profile?.full_name || uid,
        daily,
        total,
      }
    })

    setWorkers(rows.sort((a, b) => b.total - a.total))
    setLoading(false)
  }, [siteId, year, month])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = () => {
    if (workers.length === 0) return
    const headers = ['Code', 'Name', ...days.map(d => fmtDate(d)), 'Total']
    const csvRows = workers.map(w => [
      w.worker_code || '',
      w.full_name,
      ...days.map(d => {
        const h = w.daily[fmtDate(d)]
        return h ? h.toFixed(1) : ''
      }),
      w.total.toFixed(1),
    ])

    const totalHours = workers.reduce((s, w) => s + w.total, 0)
    const csv = [
      `Hours Sheet - ${siteName} - ${monthLabel}`,
      `Exported: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
      '',
      `"Total Workers","${workers.length}"`,
      `"Total Hours","${totalHours.toFixed(1)}"`,
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hours-sheet-${siteName.replace(/\s+/g, '-').toLowerCase()}-${year}-${String(month + 1).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalHours = workers.reduce((s, w) => s + w.total, 0)
  const avgPerDay = workers.length > 0 && days.length > 0
    ? totalHours / days.length
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  if (workers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-1 justify-center">
          <button onClick={prevMonth} className="p-1 hover:bg-[#F5F5F7] rounded transition">
            <ChevronLeft className="w-4 h-4 text-[#86868B]" />
          </button>
          <span className="text-sm font-medium text-[#1D1D1F] min-w-[140px] text-center">
            {monthLabel}
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-[#F5F5F7] rounded transition">
            <ChevronRight className="w-4 h-4 text-[#86868B]" />
          </button>
        </div>
        <div className="text-center py-20 bg-white rounded-xl border border-[#D2D2D7]">
          <AlertTriangle className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
          <p className="text-lg font-semibold text-[#1D1D1F]">No hours recorded</p>
          <p className="text-sm text-[#86868B] mt-1">
            Link Timekeeper geofences to this site to see hours here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#F5F5F7] rounded-lg px-2 py-1">
            <button onClick={prevMonth} className="p-1 hover:bg-[#E5E5EA] rounded transition">
              <ChevronLeft className="w-4 h-4 text-[#86868B]" />
            </button>
            <span className="text-sm font-medium text-[#1D1D1F] min-w-[140px] text-center">
              {monthLabel}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-[#E5E5EA] rounded transition">
              <ChevronRight className="w-4 h-4 text-[#86868B]" />
            </button>
          </div>
          <p className="text-sm text-[#86868B]">
            {workers.length} workers | {totalHours.toFixed(1)}h total | Avg {avgPerDay.toFixed(1)}h/day
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-[#0056B3] transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 sticky left-0 bg-[#F5F5F7] z-10 min-w-[60px]">
                Code
              </th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 sticky left-[60px] bg-[#F5F5F7] z-10 min-w-[120px]">
                Name
              </th>
              {days.map(d => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                return (
                  <th
                    key={fmtDate(d)}
                    className={`text-center text-[10px] font-semibold uppercase px-1 py-2 min-w-[42px] ${
                      isWeekend ? 'text-[#AEAEB2] bg-[#E5E5EA]' : 'text-[#86868B]'
                    }`}
                  >
                    <div>{DAY_NAMES[d.getDay()]}</div>
                    <div className="text-xs">{d.getDate()}</div>
                  </th>
                )
              })}
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[60px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {workers.map(w => (
              <tr key={w.worker_id} className="border-b border-[#E5E5EA] hover:bg-[#F9F9FB]">
                <td className="px-3 py-2 text-xs text-[#86868B] font-mono sticky left-0 bg-white z-10">
                  {w.worker_code || '—'}
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-[#1D1D1F] sticky left-[60px] bg-white z-10 whitespace-nowrap">
                  {w.full_name}
                </td>
                {days.map(d => {
                  const key = fmtDate(d)
                  const h = w.daily[key]
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <td
                      key={key}
                      className={`px-1 py-2 text-center text-xs tabular-nums ${
                        isWeekend ? 'bg-[#F5F5F7]' : ''
                      } ${h && h >= 8 ? 'text-[#34C759] font-medium' : h ? 'text-[#6E6E73]' : 'text-[#D1D5DB]'}`}
                    >
                      {h ? h.toFixed(1) : '—'}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-right text-sm font-semibold text-[#1D1D1F] tabular-nums">
                  {w.total.toFixed(1)}h
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F5F5F7] border-t border-[#D2D2D7]">
              <td colSpan={2} className="px-3 py-3 text-sm font-semibold text-[#1D1D1F] sticky left-0 bg-[#F5F5F7] z-10">
                {workers.length} workers
              </td>
              {days.map(d => {
                const key = fmtDate(d)
                const dayTotal = workers.reduce((s, w) => s + (w.daily[key] || 0), 0)
                return (
                  <td key={key} className="px-1 py-3 text-center text-xs font-semibold text-[#1D1D1F] tabular-nums">
                    {dayTotal > 0 ? dayTotal.toFixed(0) : ''}
                  </td>
                )
              })}
              <td className="px-3 py-3 text-right text-sm font-bold text-[#1D1D1F] tabular-nums">
                {totalHours.toFixed(1)}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
