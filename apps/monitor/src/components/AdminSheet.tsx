'use client'

/**
 * ADM Sheet — Admin checklist per unit (K/N flags)
 * Mirrors Avalon CONTROL "ADM" tab exactly.
 * Rows = admin items, Cols = lot numbers, Cells = K/N/empty
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AdminSheetProps {
  siteId: string
  siteName: string
}

interface LotColumn {
  id: string
  lot_number: string
}

// ADM items from Avalon CONTROL — exact list
const ADM_ITEMS = [
  'Plating',
  'Steel Beams',
  'Steel Posts',
  'Tyvek/Glue',
  'Hangers',
  'Siting Sheet',
  'Lot Specifics',
  'Floor Layout',
  'Decor Plans',
  'RSO Sheet',
  'Plot Plan',
  'Truss Layout',
  'Trusses Sheets',
  'Measurements',
  'Opening Stair',
  'Floor Layout 2F',
  'Point Loads',
  'Floor Leveled',
  'Hangers Installed',
  'Squash Blocks',
  'Fire Sep./Roxul',
  'Landings',
  'Electric P. Wall',
  'Temp Stair',
  'Guardrails',
  'Ramps',
  'Posts',
]

export default function AdminSheet({ siteId, siteName }: AdminSheetProps) {
  const [loading, setLoading] = useState(true)
  const [lots, setLots] = useState<LotColumn[]>([])
  const [data, setData] = useState<Record<string, Record<string, string>>>({})

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: houses } = await supabase
      .from('egl_houses')
      .select('id, lot_number')
      .eq('site_id', siteId)
      .order('lot_number')

    if (!houses?.length) {
      setLots([])
      setLoading(false)
      return
    }

    setLots(houses)

    // Try to load admin checklist data from egl_schedule_phases with admin-type phases
    // If no data exists yet, show empty grid
    const houseIds = houses.map(h => h.id)

    const { data: schedules } = await supabase
      .from('egl_schedules')
      .select('id, house_id')
      .in('house_id', houseIds)

    const scheduleIds = (schedules || []).map(s => s.id)
    const scheduleToHouse = new Map((schedules || []).map(s => [s.id, s.house_id]))

    const { data: phases } = await supabase
      .from('egl_schedule_phases')
      .select('schedule_id, phase_id, status')
      .in('schedule_id', scheduleIds)

    // Get admin phases — match by name (phases now exist in DB with exact Avalon names)
    const { data: phaseDefs } = await supabase
      .from('ref_eagle_phases')
      .select('id, name')
      .eq('sheet_section', 'admin')

    // Build lookup: phase_id → ADM item label (exact name match)
    const phaseIdToItem = new Map<string, string>()
    for (const p of phaseDefs || []) {
      const pName = p.name || ''
      if (ADM_ITEMS.includes(pName)) {
        phaseIdToItem.set(p.id, pName)
      }
    }

    // Build data map: { houseId: { itemLabel: K/N } }
    const dataMap: Record<string, Record<string, string>> = {}
    for (const h of houses) {
      dataMap[h.id] = {}
    }

    for (const sp of phases || []) {
      const houseId = scheduleToHouse.get(sp.schedule_id)
      if (!houseId || !dataMap[houseId]) continue

      const itemLabel = phaseIdToItem.get(sp.phase_id)
      if (!itemLabel) continue

      dataMap[houseId][itemLabel] = sp.status === 'completed' ? 'K' : sp.status === 'blocked' ? 'N' : ''
    }

    setData(dataMap)
    setLoading(false)
  }, [siteId])

  useEffect(() => { loadData() }, [loadData])

  // Stats
  const totalCells = ADM_ITEMS.length * lots.length
  const kCount = Object.values(data).reduce((sum, lotData) =>
    sum + Object.values(lotData).filter(v => v === 'K').length, 0
  )
  const nCount = Object.values(data).reduce((sum, lotData) =>
    sum + Object.values(lotData).filter(v => v === 'N').length, 0
  )

  const handleExport = () => {
    if (!lots.length) return
    const headers = ['Item', ...lots.map(l => l.lot_number)]
    const csvRows = ADM_ITEMS.map(item => [
      item,
      ...lots.map(l => data[l.id]?.[item] || ''),
    ])
    const csv = [
      `ADM Sheet - ${siteName}`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `adm-${siteName.replace(/\s+/g, '-').toLowerCase()}.csv`
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

  if (!lots.length) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-[#D2D2D7]">
        <AlertTriangle className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
        <p className="text-lg font-semibold text-[#1D1D1F]">No lots found</p>
        <p className="text-sm text-[#86868B] mt-1">Add lots to see the ADM checklist.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[#1D1D1F]">{lots.length} lots</span>
          <span className="text-xs text-[#86868B]">{ADM_ITEMS.length} items</span>
          {kCount > 0 && (
            <span className="text-xs font-medium text-[#34C759]">{kCount} done (K)</span>
          )}
          {nCount > 0 && (
            <span className="text-xs font-medium text-[#FF3B30]">{nCount} missing (N)</span>
          )}
          <span className="text-xs text-[#86868B]">{totalCells - kCount - nCount} pending</span>
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
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 sticky left-0 bg-[#F5F5F7] z-10 min-w-[180px]">
                Item
              </th>
              {lots.map(lot => (
                <th key={lot.id} className="text-center text-xs font-semibold text-[#86868B] px-1 py-3 min-w-[45px]">
                  {lot.lot_number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADM_ITEMS.map(item => (
              <tr key={item} className="border-b border-[#F0F0F2] hover:bg-[#F9F9FB]">
                <td className="px-3 py-2 text-sm text-[#1D1D1F] sticky left-0 bg-white z-10 whitespace-nowrap font-medium">
                  {item}
                </td>
                {lots.map(lot => {
                  const val = data[lot.id]?.[item] || ''
                  return (
                    <td key={lot.id} className="px-1 py-2 text-center">
                      {val === 'K' ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#34C759]/15 text-[#34C759] text-xs font-bold">
                          K
                        </span>
                      ) : val === 'N' ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#FF3B30]/15 text-[#FF3B30] text-xs font-bold">
                          N
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#E5E5EA]">-</span>
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
