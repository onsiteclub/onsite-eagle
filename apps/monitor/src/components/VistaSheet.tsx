'use client'

/**
 * Overview Sheet — Main overview: Lot × Worker-per-phase × Model × SqFt × $$
 * Based on Avalon CONTROL "Vista 2" tab structure.
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface VistaSheetProps {
  siteId: string
  siteName: string
}

interface LotRow {
  lot_number: string
  model: string
  sqft: number
  bsmt_sqft: number
  cap: string
  frame: string
  roof: string
  bsmt: string
  backing: string
  strap: string
  framing_value: number
  roofing_value: number
  backing_value: number
  basement_value: number
}

// Trade phase names used for assignment lookups
const TRADE_PHASES = ['Framing', 'Roofing', 'Basement', 'Backing', 'Strapping']

export default function VistaSheet({ siteId, siteName }: VistaSheetProps) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LotRow[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    // Get all houses for this site
    const { data: houses } = await supabase
      .from('egl_houses')
      .select('id, lot_number, address, sqft_total, sqft_basement')
      .eq('site_id', siteId)
      .order('lot_number')

    if (!houses?.length) {
      setRows([])
      setLoading(false)
      return
    }

    const houseIds = houses.map(h => h.id)

    // Get phase definitions to map phase_id → trade name
    const { data: phaseDefs } = await supabase
      .from('ref_eagle_phases')
      .select('id, trade_category')

    // Direct trade_category mapping — no guessing from name/category
    const phaseTradeMap = new Map<string, string>()
    for (const p of phaseDefs || []) {
      if (p.trade_category) phaseTradeMap.set(p.id, p.trade_category)
    }

    // Get phase assignments (worker_id UUID FK → core_profiles)
    const { data: assignments } = await supabase
      .from('egl_phase_assignments')
      .select('house_id, phase_id, worker_id')
      .in('house_id', houseIds)

    // Get worker profiles for assigned workers
    const workerIds = [...new Set((assignments || []).map(a => a.worker_id).filter(Boolean))]
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

    // Get phase rates (phase_id UUID, not phase_name)
    const { data: rates } = await supabase
      .from('egl_phase_rates')
      .select('phase_id, rate_per_sqft, rate_per_sqft_basement')
      .eq('site_id', siteId)

    // Get schedules for CAP (assigned_worker_name or assigned_worker_id)
    const { data: schedules } = await supabase
      .from('egl_schedules')
      .select('house_id, assigned_worker_id, assigned_worker_name')
      .in('house_id', houseIds)

    // Build assignment map: house_id → { trade → worker_name }
    const assignmentMap = new Map<string, Map<string, string>>()
    for (const a of assignments || []) {
      if (!assignmentMap.has(a.house_id)) assignmentMap.set(a.house_id, new Map())
      const trade = phaseTradeMap.get(a.phase_id)
      if (!trade) continue
      const workerName = workerNameMap.get(a.worker_id) || ''
      assignmentMap.get(a.house_id)!.set(trade, workerName)
    }

    // Build rate map: trade → { sqft, bsmt }
    const rateMap = new Map<string, { sqft: number; bsmt: number }>()
    for (const r of rates || []) {
      const trade = phaseTradeMap.get(r.phase_id)
      if (!trade) continue
      rateMap.set(trade, {
        sqft: r.rate_per_sqft || 0,
        bsmt: r.rate_per_sqft_basement || 0,
      })
    }

    // Build schedule map for CAP
    const scheduleMap = new Map<string, string>()
    for (const s of schedules || []) {
      // Prefer resolved name from worker_id, fallback to cached name
      let capName = s.assigned_worker_name || ''
      if (s.assigned_worker_id && workerNameMap.has(s.assigned_worker_id)) {
        capName = workerNameMap.get(s.assigned_worker_id) || capName
      }
      scheduleMap.set(s.house_id, capName)
    }

    // Build rows
    const lotRows: LotRow[] = houses.map(h => {
      const workers = assignmentMap.get(h.id) || new Map()
      const sqft = h.sqft_total || 0
      const bsmt = h.sqft_basement || 0

      const framingRate = rateMap.get('framing') || { sqft: 0, bsmt: 0 }
      const roofingRate = rateMap.get('roofing') || { sqft: 0, bsmt: 0 }
      const backingRate = rateMap.get('backing') || { sqft: 0, bsmt: 0 }
      const basementRate = rateMap.get('basement') || { sqft: 0, bsmt: 0 }

      return {
        lot_number: h.lot_number,
        model: h.address || '',
        sqft,
        bsmt_sqft: bsmt,
        cap: scheduleMap.get(h.id) || '',
        frame: workers.get('framing') || '',
        roof: workers.get('roofing') || '',
        bsmt: workers.get('basement') || '',
        backing: workers.get('backing') || '',
        strap: workers.get('strapping') || '',
        framing_value: sqft * framingRate.sqft,
        roofing_value: sqft * roofingRate.sqft,
        backing_value: sqft * backingRate.sqft,
        basement_value: bsmt * basementRate.bsmt,
      }
    })

    setRows(lotRows)
    setLoading(false)
  }, [siteId])

  useEffect(() => { loadData() }, [loadData])

  // Totals
  const totalSqft = rows.reduce((s, r) => s + r.sqft, 0)
  const totalBsmt = rows.reduce((s, r) => s + r.bsmt_sqft, 0)
  const totalFraming = rows.reduce((s, r) => s + r.framing_value, 0)
  const totalRoofing = rows.reduce((s, r) => s + r.roofing_value, 0)
  const totalBacking = rows.reduce((s, r) => s + r.backing_value, 0)
  const totalBasement = rows.reduce((s, r) => s + r.basement_value, 0)

  const fmtMoney = (v: number) => v > 0 ? `$${v.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : ''

  const handleExport = () => {
    if (!rows.length) return
    const headers = ['UNIT', 'CAP', 'FRAME', 'ROOF', 'BSMT', 'BKN', 'STRAP', 'MODEL', 'SQFT', 'BSMT SQFT', 'Framing', 'Roofing', 'Backing', 'Basement']
    const csvRows = rows.map(r => [
      r.lot_number, r.cap, r.frame, r.roof, r.bsmt, r.backing, r.strap,
      r.model, r.sqft, r.bsmt_sqft,
      r.framing_value.toFixed(0), r.roofing_value.toFixed(0),
      r.backing_value.toFixed(0), r.basement_value.toFixed(0),
    ])
    const csv = [
      `Vista - ${siteName}`,
      `${rows.length} lots,FRAMING,,,BACKING,,,,${totalSqft},${totalBsmt},${fmtMoney(totalFraming)},${fmtMoney(totalRoofing)},${fmtMoney(totalBacking)}`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vista-${siteName.replace(/\s+/g, '-').toLowerCase()}.csv`
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
        <p className="text-sm text-[#86868B] mt-1">Add lots to this site to see the Vista sheet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[#1D1D1F]">{rows.length} lots</span>
          <span className="text-xs text-[#86868B]">
            {totalSqft.toLocaleString()} sqft | {totalBsmt.toLocaleString()} bsmt
          </span>
          <span className="text-xs font-medium text-[#34C759]">{fmtMoney(totalFraming)} Framing</span>
          <span className="text-xs font-medium text-[#007AFF]">{fmtMoney(totalRoofing)} Roofing</span>
          <span className="text-xs font-medium text-[#FF9500]">{fmtMoney(totalBacking)} Backing</span>
          {totalBasement > 0 && (
            <span className="text-xs font-medium text-[#AF52DE]">{fmtMoney(totalBasement)} Basement</span>
          )}
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
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 sticky left-0 bg-[#F5F5F7] z-10 min-w-[60px]">Unit</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[70px]">CAP</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Frame</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Roof</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Bsmt</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">BKN</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[70px]">Strap</th>
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[140px]">Model</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[60px]">SqFt</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[60px]">Bsmt</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Framing</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Roofing</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Backing</th>
              <th className="text-right text-xs font-semibold text-[#86868B] uppercase px-3 py-3 min-w-[80px]">Basement</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.lot_number} className="border-b border-[#E5E5EA] hover:bg-[#F9F9FB]">
                <td className="px-3 py-2 text-sm font-mono font-semibold text-[#1D1D1F] sticky left-0 bg-white z-10">{r.lot_number}</td>
                <td className="px-3 py-2 text-sm text-[#6E6E73]">{r.cap || '—'}</td>
                <td className="px-3 py-2 text-sm text-[#1D1D1F]">{r.frame || '—'}</td>
                <td className="px-3 py-2 text-sm text-[#1D1D1F]">{r.roof || '—'}</td>
                <td className="px-3 py-2 text-sm text-[#1D1D1F]">{r.bsmt || '—'}</td>
                <td className="px-3 py-2 text-sm text-[#1D1D1F]">{r.backing || '—'}</td>
                <td className="px-3 py-2 text-sm text-[#1D1D1F]">{r.strap || '—'}</td>
                <td className="px-3 py-2 text-sm text-[#6E6E73] whitespace-nowrap">{r.model || '—'}</td>
                <td className="px-3 py-2 text-sm text-right tabular-nums text-[#1D1D1F]">{r.sqft > 0 ? r.sqft.toLocaleString() : '—'}</td>
                <td className="px-3 py-2 text-sm text-right tabular-nums text-[#6E6E73]">{r.bsmt_sqft > 0 ? r.bsmt_sqft.toLocaleString() : ''}</td>
                <td className="px-3 py-2 text-sm text-right tabular-nums text-[#34C759] font-medium">{fmtMoney(r.framing_value)}</td>
                <td className="px-3 py-2 text-sm text-right tabular-nums text-[#007AFF] font-medium">{fmtMoney(r.roofing_value)}</td>
                <td className="px-3 py-2 text-sm text-right tabular-nums text-[#FF9500] font-medium">{fmtMoney(r.backing_value)}</td>
                <td className="px-3 py-2 text-sm text-right tabular-nums text-[#AF52DE] font-medium">{fmtMoney(r.basement_value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F5F5F7] border-t border-[#D2D2D7]">
              <td className="px-3 py-3 text-sm font-semibold text-[#1D1D1F] sticky left-0 bg-[#F5F5F7] z-10">{rows.length}</td>
              <td colSpan={7} className="px-3 py-3" />
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#1D1D1F]">{totalSqft.toLocaleString()}</td>
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#6E6E73]">{totalBsmt.toLocaleString()}</td>
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#34C759]">{fmtMoney(totalFraming)}</td>
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#007AFF]">{fmtMoney(totalRoofing)}</td>
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#FF9500]">{fmtMoney(totalBacking)}</td>
              <td className="px-3 py-3 text-sm text-right font-bold tabular-nums text-[#AF52DE]">{fmtMoney(totalBasement)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
