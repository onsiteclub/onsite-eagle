'use client'

/**
 * Worker Sheet — Registry of workers/crews with totals.
 * Based on the "Framers" tab of the Avalon CONTROL.xlsx
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface WorkerSheetProps {
  siteId: string
  siteName: string
}

interface WorkerRow {
  worker_id: string
  worker_code: string | null
  full_name: string
  crew_name: string | null
  lots_count: number
  phases_count: number
  total_sqft: number
  total_value: number
}

export default function WorkerSheet({ siteId, siteName }: WorkerSheetProps) {
  const [loading, setLoading] = useState(true)
  const [workers, setWorkers] = useState<WorkerRow[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: houses } = await supabase
      .from('egl_houses')
      .select('id, lot_number, sqft_total')
      .eq('site_id', siteId)

    if (!houses?.length) {
      setWorkers([])
      setLoading(false)
      return
    }

    const houseIds = houses.map(h => h.id)
    const houseMap = new Map(houses.map(h => [h.id, h]))

    const { data: assignments } = await supabase
      .from('egl_phase_assignments')
      .select('worker_id, house_id, phase_id, rate_per_sqft, total_value')
      .in('house_id', houseIds)

    if (!assignments?.length) {
      // Fallback: check egl_schedules for house-level workers
      const { data: schedules } = await supabase
        .from('egl_schedules')
        .select('house_id, assigned_worker_name')
        .eq('site_id', siteId)
        .not('assigned_worker_name', 'is', null)

      if (schedules?.length) {
        const byName = new Map<string, { lots: Set<string>; sqft: number }>()
        for (const s of schedules) {
          const name = s.assigned_worker_name!
          if (!byName.has(name)) byName.set(name, { lots: new Set(), sqft: 0 })
          const entry = byName.get(name)!
          entry.lots.add(s.house_id)
          entry.sqft += houseMap.get(s.house_id)?.sqft_total || 0
        }

        const rows: WorkerRow[] = Array.from(byName.entries()).map(([name, data]) => ({
          worker_id: name,
          worker_code: null,
          full_name: name,
          crew_name: null,
          lots_count: data.lots.size,
          phases_count: data.lots.size,
          total_sqft: data.sqft,
          total_value: 0,
        }))

        setWorkers(rows.sort((a, b) => b.total_sqft - a.total_sqft))
      } else {
        setWorkers([])
      }
      setLoading(false)
      return
    }

    const workerIds = [...new Set(assignments.map(a => a.worker_id))]

    const { data: profiles } = await supabase
      .from('core_profiles')
      .select('id, full_name, worker_code')
      .in('id', workerIds)

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    )

    const { data: memberships } = await supabase
      .from('egl_crew_members')
      .select('worker_id, crew_id')
      .in('worker_id', workerIds)

    const crewIds = [...new Set((memberships || []).map(m => m.crew_id))]
    let crewMap = new Map<string, string>()
    if (crewIds.length > 0) {
      const { data: crews } = await supabase
        .from('egl_crews')
        .select('id, name')
        .in('id', crewIds)
      crewMap = new Map((crews || []).map(c => [c.id, c.name]))
    }

    const membershipMap = new Map<string, string>()
    for (const m of (memberships || [])) {
      membershipMap.set(m.worker_id, crewMap.get(m.crew_id) || '')
    }

    const byWorker = new Map<string, { lots: Set<string>; phases: number; sqft: number; value: number }>()
    for (const a of assignments) {
      if (!byWorker.has(a.worker_id)) {
        byWorker.set(a.worker_id, { lots: new Set(), phases: 0, sqft: 0, value: 0 })
      }
      const entry = byWorker.get(a.worker_id)!
      entry.lots.add(a.house_id)
      entry.phases++
      entry.sqft += houseMap.get(a.house_id)?.sqft_total || 0
      entry.value += a.total_value || 0
    }

    const rows: WorkerRow[] = Array.from(byWorker.entries()).map(([wid, data]) => {
      const profile = profileMap.get(wid)
      return {
        worker_id: wid,
        worker_code: profile?.worker_code || null,
        full_name: profile?.full_name || wid,
        crew_name: membershipMap.get(wid) || null,
        lots_count: data.lots.size,
        phases_count: data.phases,
        total_sqft: data.sqft,
        total_value: data.value,
      }
    })

    setWorkers(rows.sort((a, b) => b.total_sqft - a.total_sqft))
    setLoading(false)
  }, [siteId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = () => {
    if (workers.length === 0) return
    const headers = ['Code', 'Name', 'Crew', 'Lots', 'Phases', 'SqFt', 'Value ($)']
    const csvRows = workers.map(w => [
      w.worker_code || '',
      w.full_name,
      w.crew_name || '',
      w.lots_count,
      w.phases_count,
      w.total_sqft.toLocaleString(),
      w.total_value ? `$${w.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '',
    ])
    const csv = [
      `Worker Sheet - ${siteName}`,
      `Exported: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
      '',
      `"Total Workers","${workers.length}"`,
      `"Total SqFt","${workers.reduce((s, w) => s + w.total_sqft, 0).toLocaleString()}"`,
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worker-sheet-${siteName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  if (workers.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-[#D2D2D7]">
        <AlertTriangle className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
        <p className="text-lg font-semibold text-[#1D1D1F]">No workers assigned</p>
        <p className="text-sm text-[#86868B] mt-1">
          Assign workers to phases to see the worker sheet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#86868B]">
          {workers.length} workers | {workers.reduce((s, w) => s + w.total_sqft, 0).toLocaleString()} total sqft
        </p>
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
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Code</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Crew</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Lots</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Phases</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3">SqFt</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3">Value ($)</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(w => (
              <tr key={w.worker_id} className="border-b border-[#E5E5EA] hover:bg-[#F9F9FB]">
                <td className="px-3 py-2.5 text-sm text-[#86868B] font-mono">{w.worker_code || '—'}</td>
                <td className="px-3 py-2.5 text-sm font-semibold text-[#1D1D1F]">{w.full_name}</td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73]">{w.crew_name || '—'}</td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73] text-right tabular-nums">{w.lots_count}</td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73] text-right tabular-nums">{w.phases_count}</td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73] text-right tabular-nums">{w.total_sqft.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-sm font-medium text-[#1D1D1F] text-right tabular-nums">
                  {w.total_value > 0
                    ? `$${w.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : '—'
                  }
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F5F5F7] border-t border-[#D2D2D7]">
              <td colSpan={3} className="px-3 py-3 text-sm font-semibold text-[#1D1D1F]">
                {workers.length} workers
              </td>
              <td className="px-3 py-3 text-right text-sm font-semibold text-[#1D1D1F] tabular-nums">
                {workers.reduce((s, w) => s + w.lots_count, 0)}
              </td>
              <td className="px-3 py-3 text-right text-sm font-semibold text-[#1D1D1F] tabular-nums">
                {workers.reduce((s, w) => s + w.phases_count, 0)}
              </td>
              <td className="px-3 py-3 text-right text-sm font-semibold text-[#1D1D1F] tabular-nums">
                {workers.reduce((s, w) => s + w.total_sqft, 0).toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right text-sm font-semibold text-[#1D1D1F] tabular-nums">
                ${workers.reduce((s, w) => s + w.total_value, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
