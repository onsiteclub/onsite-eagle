'use client'

/**
 * Progress Sheet — Lot × 4 trades (Framing/Roofing/Backing/Inspection) in %.
 * Mirrors Avalon CONTROL "Progress" tab exactly.
 * Simplified from generic N-phase matrix to exactly 4 trade columns.
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ProgressSheetProps {
  siteId: string
  siteName: string
}

interface LotProgress {
  lot_number: string
  lot_id: string
  model: string
  framing: number
  roofing: number
  backing: number
  inspection: number
}

// Color coding: 0=empty, 1-49=red, 50-99=yellow, 100=green
function getProgressColor(value: number): string {
  if (value <= 0) return '#D1D5DB'
  if (value < 50) return '#FF3B30'
  if (value < 100) return '#FF9500'
  return '#34C759'
}

function getProgressBg(value: number): string {
  if (value <= 0) return 'transparent'
  if (value < 50) return '#FF3B30' + '15'
  if (value < 100) return '#FF9500' + '15'
  return '#34C759' + '15'
}

export default function ProgressSheet({ siteId, siteName }: ProgressSheetProps) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LotProgress[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: houses } = await supabase
      .from('frm_lots')
      .select('id, lot_number, address')
      .eq('jobsite_id', siteId)
      .order('lot_number')

    if (!houses?.length) {
      setRows([])
      setLoading(false)
      return
    }

    const houseIds = houses.map(h => h.id)

    // Get schedules
    const { data: schedules } = await supabase
      .from('frm_schedules')
      .select('id, lot_id')
      .in('lot_id', houseIds)

    const scheduleIds = (schedules || []).map(s => s.id)
    const scheduleToHouse = new Map((schedules || []).map(s => [s.id, s.lot_id]))

    // Get schedule phases
    const { data: spData } = await supabase
      .from('frm_schedule_phases')
      .select('schedule_id, phase_id, status')
      .in('schedule_id', scheduleIds)

    // Get phase definitions with trade_category for direct mapping
    const { data: phaseDefs } = await supabase
      .from('ref_eagle_phases')
      .select('id, trade_category')

    // Map phase_id → trade using trade_category (set by migration, no guessing)
    const phaseToTrade = new Map<string, 'framing' | 'roofing' | 'backing' | 'inspection'>()
    for (const p of phaseDefs || []) {
      const tc = p.trade_category as string | null
      if (tc === 'framing' || tc === 'roofing' || tc === 'backing' || tc === 'inspection') {
        phaseToTrade.set(p.id, tc)
      }
    }

    // Group phases by house and trade
    const houseTradeMap = new Map<string, { framing: string[]; roofing: string[]; backing: string[]; inspection: string[] }>()

    for (const h of houses) {
      houseTradeMap.set(h.id, { framing: [], roofing: [], backing: [], inspection: [] })
    }

    for (const sp of spData || []) {
      const houseId = scheduleToHouse.get(sp.schedule_id)
      if (!houseId) continue
      const trades = houseTradeMap.get(houseId)
      if (!trades) continue

      const trade = phaseToTrade.get(sp.phase_id)
      if (trade) {
        trades[trade].push(sp.status)
      }
    }

    // Calculate percentage per trade
    const calcPct = (statuses: string[]): number => {
      if (!statuses.length) return 0
      const completed = statuses.filter(s => s === 'completed').length
      return Math.round((completed / statuses.length) * 100)
    }

    const lotRows: LotProgress[] = houses.map(h => {
      const trades = houseTradeMap.get(h.id) || { framing: [], roofing: [], backing: [], inspection: [] }
      return {
        lot_number: h.lot_number,
        lot_id: h.id,
        model: h.address || '',
        framing: calcPct(trades.framing),
        roofing: calcPct(trades.roofing),
        backing: calcPct(trades.backing),
        inspection: calcPct(trades.inspection),
      }
    })

    setRows(lotRows)
    setLoading(false)
  }, [siteId])

  useEffect(() => { loadData() }, [loadData])

  // Summary stats
  const avgFraming = rows.length ? Math.round(rows.reduce((s, r) => s + r.framing, 0) / rows.length) : 0
  const avgRoofing = rows.length ? Math.round(rows.reduce((s, r) => s + r.roofing, 0) / rows.length) : 0
  const avgBacking = rows.length ? Math.round(rows.reduce((s, r) => s + r.backing, 0) / rows.length) : 0
  const avgInspection = rows.length ? Math.round(rows.reduce((s, r) => s + r.inspection, 0) / rows.length) : 0
  const completed100 = rows.filter(r => r.framing === 100 && r.roofing === 100 && r.backing === 100 && r.inspection === 100).length

  const handleExport = () => {
    if (!rows.length) return
    const headers = ['Lot', 'Model / Elevation', 'Framing', 'Roofing', 'Backing', 'Inspection']
    const csvRows = rows.map(r => [
      r.lot_number, r.model, r.framing, r.roofing, r.backing, r.inspection,
    ])
    const csv = [
      `Progress Sheet - ${siteName}`,
      `${rows.length} lots, ${completed100} fully complete`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `progress-${siteName.replace(/\s+/g, '-').toLowerCase()}.csv`
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
        <p className="text-lg font-semibold text-[#1D1D1F]">No lots found</p>
        <p className="text-sm text-[#86868B] mt-1">Add lots to see progress.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[#1D1D1F]">{rows.length} lots</span>
          <span className="text-xs font-medium text-[#34C759]">{completed100} fully complete</span>
          <span className="text-xs text-[#86868B]">
            Avg: Framing {avgFraming}% | Roofing {avgRoofing}% | Backing {avgBacking}% | Inspection {avgInspection}%
          </span>
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
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 sticky left-0 bg-[#F5F5F7] z-10 min-w-[60px]">Lot</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[160px]">Model / Elevation</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[100px]">Framing</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[100px]">Roofing</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[100px]">Backing</th>
              <th className="text-center text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[100px]">Inspection</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.lot_id} className="border-b border-[#E5E5EA] hover:bg-[#F9F9FB]">
                <td className="px-3 py-2.5 text-sm font-mono font-semibold text-[#1D1D1F] sticky left-0 bg-white z-10">{r.lot_number}</td>
                <td className="px-3 py-2.5 text-sm text-[#6E6E73] whitespace-nowrap">{r.model || '—'}</td>
                {[r.framing, r.roofing, r.backing, r.inspection].map((val, i) => (
                  <td key={i} className="px-3 py-2.5 text-center">
                    {val > 0 ? (
                      <span
                        className="inline-block px-2.5 py-1 rounded text-xs font-bold tabular-nums"
                        style={{
                          color: getProgressColor(val),
                          backgroundColor: getProgressBg(val),
                        }}
                      >
                        {val}
                      </span>
                    ) : (
                      <span className="text-xs text-[#D1D5DB]">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F5F5F7] border-t border-[#D2D2D7]">
              <td className="px-3 py-3 text-sm font-semibold text-[#1D1D1F] sticky left-0 bg-[#F5F5F7] z-10">{rows.length}</td>
              <td className="px-3 py-3 text-sm text-[#86868B]">Average</td>
              {[avgFraming, avgRoofing, avgBacking, avgInspection].map((val, i) => (
                <td key={i} className="px-3 py-3 text-center">
                  <span
                    className="inline-block px-2.5 py-1 rounded text-xs font-bold tabular-nums"
                    style={{
                      color: getProgressColor(val),
                      backgroundColor: getProgressBg(val),
                    }}
                  >
                    {val}%
                  </span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
