'use client'

/**
 * Framers Sheet — Worker/crew registry with lot counts per trade.
 * Mirrors Avalon CONTROL "Framers" tab exactly.
 * Columns: # | Crew/Worker | Frame (count) | Roof (count) | Total
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FramersSheetProps {
  siteId: string
  siteName: string
}

interface FramerRow {
  index: number
  name: string
  frame_count: number
  roof_count: number
  total: number
}

export default function FramersSheet({ siteId, siteName }: FramersSheetProps) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<FramerRow[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    // Get all houses for this site
    const { data: houses } = await supabase
      .from('egl_houses')
      .select('id')
      .eq('site_id', siteId)

    if (!houses?.length) {
      setRows([])
      setLoading(false)
      return
    }

    const houseIds = houses.map(h => h.id)

    // Get phase definitions with trade_category for direct mapping
    const { data: phaseDefs } = await supabase
      .from('ref_eagle_phases')
      .select('id, trade_category')

    const phaseTradeMap = new Map<string, string>()
    for (const p of phaseDefs || []) {
      if (p.trade_category) phaseTradeMap.set(p.id, p.trade_category)
    }

    // Get phase assignments — worker_id UUID FK, phase_id UUID FK
    const { data: assignments } = await supabase
      .from('egl_phase_assignments')
      .select('house_id, phase_id, worker_id')
      .in('house_id', houseIds)

    if (!assignments?.length) {
      setRows([])
      setLoading(false)
      return
    }

    // Get worker profiles
    const workerIds = [...new Set(assignments.map(a => a.worker_id).filter(Boolean))]
    const workerNameMap = new Map<string, string>()
    if (workerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('core_profiles')
        .select('id, full_name, first_name, preferred_name')
        .in('id', workerIds)
      for (const p of profiles || []) {
        workerNameMap.set(p.id, p.preferred_name || p.first_name || p.full_name || '')
      }
    }

    // Count by worker_id: how many lots they frame, roof, etc.
    const workerCountMap = new Map<string, { frame: Set<string>; roof: Set<string>; all: Set<string> }>()

    for (const a of assignments) {
      const workerId = a.worker_id
      if (!workerId) continue
      if (!workerCountMap.has(workerId)) {
        workerCountMap.set(workerId, { frame: new Set(), roof: new Set(), all: new Set() })
      }
      const w = workerCountMap.get(workerId)!
      w.all.add(a.house_id)

      const trade = phaseTradeMap.get(a.phase_id)
      if (trade === 'framing') w.frame.add(a.house_id)
      else if (trade === 'roofing') w.roof.add(a.house_id)
    }

    // Build rows sorted by total desc
    const framerRows: FramerRow[] = Array.from(workerCountMap.entries())
      .map(([workerId, counts]) => ({
        index: 0,
        name: workerNameMap.get(workerId) || 'Unknown',
        frame_count: counts.frame.size,
        roof_count: counts.roof.size,
        total: counts.all.size,
      }))
      .sort((a, b) => b.total - a.total)
      .map((r, i) => ({ ...r, index: i + 1 }))

    setRows(framerRows)
    setLoading(false)
  }, [siteId])

  useEffect(() => { loadData() }, [loadData])

  // Totals
  const totalFrame = rows.reduce((s, r) => s + r.frame_count, 0)
  const totalRoof = rows.reduce((s, r) => s + r.roof_count, 0)
  const totalAll = rows.reduce((s, r) => s + r.total, 0)

  const handleExport = () => {
    if (!rows.length) return
    const headers = ['#', 'Crew', 'Frame', 'Roof', 'Total']
    const csvRows = rows.map(r => [r.index, r.name, r.frame_count, r.roof_count, r.total])
    const csv = [
      `Framers - ${siteName}`,
      `${rows.length} workers/crews`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
      '',
      `"","Total","${totalFrame}","${totalRoof}","${totalAll}"`,
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `framers-${siteName.replace(/\s+/g, '-').toLowerCase()}.csv`
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

  if (!rows.length) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-[#D2D2D7]">
        <AlertTriangle className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
        <p className="text-lg font-semibold text-[#1D1D1F]">No workers found</p>
        <p className="text-sm text-[#86868B] mt-1">Phase assignments will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[#1D1D1F]">{rows.length} workers/crews</span>
          <span className="text-xs font-medium text-[#34C759]">{totalFrame} framing assignments</span>
          <span className="text-xs font-medium text-[#007AFF]">{totalRoof} roofing assignments</span>
          <span className="text-xs text-[#86868B]">{totalAll} total</span>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-[#0056B3] transition">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-3 py-3 w-12">#</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[200px]">Crew</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Frame</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Roof</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name} className="border-b border-[#E5E5EA] hover:bg-[#F9F9FB]">
                <td className="px-3 py-2.5 text-center text-sm text-[#86868B] font-mono">{r.index}</td>
                <td className="px-3 py-2.5 text-sm font-semibold text-[#1D1D1F]">{r.name}</td>
                <td className="px-3 py-2.5 text-sm text-right tabular-nums text-[#34C759] font-medium">
                  {r.frame_count > 0 ? r.frame_count : '—'}
                </td>
                <td className="px-3 py-2.5 text-sm text-right tabular-nums text-[#007AFF] font-medium">
                  {r.roof_count > 0 ? r.roof_count : '—'}
                </td>
                <td className="px-3 py-2.5 text-sm text-right tabular-nums text-[#1D1D1F] font-bold">
                  {r.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F5F5F7] border-t border-[#D2D2D7]">
              <td className="px-3 py-3" />
              <td className="px-3 py-3 text-sm font-semibold text-[#1D1D1F]">{rows.length} total</td>
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#34C759]">{totalFrame}</td>
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#007AFF]">{totalRoof}</td>
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#1D1D1F]">{totalAll}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
