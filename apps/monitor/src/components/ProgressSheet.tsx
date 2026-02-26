'use client'

/**
 * Progress Sheet — Lot x Phase matrix showing completion status.
 * Based on the "Management" tab of the Avalon CONTROL.xlsx
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ProgressSheetProps {
  siteId: string
  siteName: string
}

interface Phase {
  id: string
  name: string
  order_index: number
}

interface LotProgress {
  lot_number: string
  house_id: string
  house_status: string
  phases: Record<string, { status: string; actual_end_date: string | null }>
}

const PHASE_STATUS_ICONS: Record<string, { symbol: string; color: string }> = {
  completed: { symbol: '\u2705', color: '#34C759' },
  in_progress: { symbol: '\uD83D\uDD35', color: '#007AFF' },
  blocked: { symbol: '\uD83D\uDD34', color: '#FF3B30' },
  inspection: { symbol: '\uD83D\uDFE1', color: '#FF9500' },
  pending: { symbol: '\u26AA', color: '#D1D5DB' },
  skipped: { symbol: '\u2796', color: '#8E8E93' },
}

export default function ProgressSheet({ siteId, siteName }: ProgressSheetProps) {
  const [loading, setLoading] = useState(true)
  const [phases, setPhases] = useState<Phase[]>([])
  const [lots, setLots] = useState<LotProgress[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: phaseData } = await supabase
      .from('ref_eagle_phases')
      .select('id, name, order_index')
      .order('order_index')
    setPhases(phaseData || [])

    const { data: houses } = await supabase
      .from('egl_houses')
      .select('id, lot_number, status')
      .eq('site_id', siteId)
      .order('lot_number')

    if (!houses?.length) {
      setLots([])
      setLoading(false)
      return
    }

    const houseIds = houses.map(h => h.id)
    const { data: schedules } = await supabase
      .from('egl_schedules')
      .select('id, house_id')
      .in('house_id', houseIds)

    const scheduleIds = (schedules || []).map(s => s.id)
    const { data: spData } = await supabase
      .from('egl_schedule_phases')
      .select('schedule_id, phase_id, status, actual_end_date')
      .in('schedule_id', scheduleIds)

    const scheduleToHouse = new Map(
      (schedules || []).map(s => [s.id, s.house_id])
    )

    const housePhaseMap = new Map<string, Record<string, { status: string; actual_end_date: string | null }>>()
    for (const sp of (spData || [])) {
      const houseId = scheduleToHouse.get(sp.schedule_id)
      if (!houseId) continue
      if (!housePhaseMap.has(houseId)) housePhaseMap.set(houseId, {})
      housePhaseMap.get(houseId)![sp.phase_id] = {
        status: sp.status,
        actual_end_date: sp.actual_end_date,
      }
    }

    const result: LotProgress[] = houses.map(h => ({
      lot_number: h.lot_number,
      house_id: h.id,
      house_status: h.status || 'not_started',
      phases: housePhaseMap.get(h.id) || {},
    }))

    setLots(result)
    setLoading(false)
  }, [siteId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = () => {
    if (lots.length === 0) return

    const headers = ['Lot', 'Status', ...phases.map(p => p.name)]
    const csvRows = lots.map(lot => [
      lot.lot_number,
      lot.house_status,
      ...phases.map(p => {
        const ph = lot.phases[p.id]
        if (!ph) return ''
        if (ph.status === 'completed' && ph.actual_end_date) {
          return new Date(ph.actual_end_date).toLocaleDateString()
        }
        return ph.status.toUpperCase()
      }),
    ])

    const csv = [
      `Progress Sheet - ${siteName}`,
      `Exported: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `progress-sheet-${siteName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const completed = lots.filter(l => l.house_status === 'completed').length
  const inProgress = lots.filter(l => l.house_status === 'in_progress').length
  const blocked = lots.filter(l => l.house_status === 'delayed').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  if (lots.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-[#D2D2D7]">
        <AlertTriangle className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
        <p className="text-lg font-semibold text-[#1D1D1F]">No lots found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#86868B]">
          {lots.length} lots | {completed} completed | {inProgress} in progress | {blocked} delayed
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
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 sticky left-0 bg-[#F5F5F7] z-10">
                Lot
              </th>
              {phases.map(p => (
                <th key={p.id} className="text-center text-xs font-semibold text-[#86868B] uppercase px-2 py-3 min-w-[80px]">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lots.map(lot => (
              <tr key={lot.house_id} className="border-b border-[#E5E5EA] hover:bg-[#F9F9FB]">
                <td className="px-3 py-2.5 text-sm font-semibold text-[#1D1D1F] sticky left-0 bg-white z-10">
                  {lot.lot_number}
                </td>
                {phases.map(p => {
                  const ph = lot.phases[p.id]
                  const info = PHASE_STATUS_ICONS[ph?.status || 'pending']
                  const dateStr = ph?.actual_end_date
                    ? new Date(ph.actual_end_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                    : ''
                  return (
                    <td key={p.id} className="px-2 py-2.5 text-center">
                      <div className="text-base" title={ph?.status || 'pending'}>
                        {info.symbol}
                      </div>
                      {dateStr && (
                        <div className="text-[10px] text-[#86868B] mt-0.5">{dateStr}</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
