'use client'

/**
 * Management Sheet — Mega-matrix: Lot × (Sub-phases + Docs + Materials)
 * Mirrors Avalon CONTROL "Management" tab exactly.
 * Rows = items (grouped by section), Cols = lots
 * Cells = date completed or empty
 */

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Loader2, Download, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ManagementSheetProps {
  siteId: string
  siteName: string
}

interface LotColumn {
  id: string
  lot_number: string
}

// Sections exactly as in Avalon CONTROL Management tab
const SECTIONS = [
  {
    id: 'construction',
    label: 'CONSTRUCTION',
    color: '#007AFF',
    items: [
      'Backfill', 'Frame Start', 'OLS Roof Ply', 'Roof Ply', 'Shingle',
      'Window', 'Prep Insulation', 'Foam Rim Board', 'Prep Drywall', 'Weld',
      'Pour Basement', 'Fireplace/HWT', 'Stairs', 'Plumbing', 'HVAC',
      'Finish Basement', 'Backing', 'Frame Check', 'Wire',
      'City Framing', 'OLS Insulation', 'City Insulation',
    ],
  },
  {
    id: 'documentation',
    label: 'DOCUMENTATION',
    color: '#FF9500',
    items: [
      'Plan', 'Red Lines', 'RSO', 'Sales Details', 'Site Grade',
      'Stair Layouts', 'Landing Detail', 'Floor Joists Layout',
      'Trusses Book', 'Kitchen Cabinets', 'Safety Expectations',
    ],
  },
  {
    id: 'materials',
    label: 'MATERIALS',
    color: '#34C759',
    items: [
      'Gasket', 'Tyvek', 'Glue', 'Hangers', 'Poly', 'Shims',
      'A32 Brackets', 'A35 Brackets', 'Steel Beams', 'Steel Adj. Posts',
      'Steel Plates', '2x10 Double/Triple Hanger',
      '1st Subfloor', '1st Walls', 'Porch Beam Lumber',
      'Flat Roof/Balcony/Landing Packages', 'Steel Posts',
      '2nd Subfloor', '2nd Walls', 'PT Porch Posts',
      'Roof Load/Trusses', 'Basement Load', 'Backing Load',
    ],
  },
]

// Build a flat list of all items with section info
const ALL_ITEMS = SECTIONS.flatMap(section =>
  section.items.map(item => ({
    key: `${section.id}::${item.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    label: item,
    sectionId: section.id,
    sectionLabel: section.label,
    sectionColor: section.color,
  }))
)

export default function ManagementSheet({ siteId, siteName }: ManagementSheetProps) {
  const [loading, setLoading] = useState(true)
  const [lots, setLots] = useState<LotColumn[]>([])
  const [data, setData] = useState<Record<string, Record<string, string>>>({})
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: houses } = await supabase
      .from('frm_lots')
      .select('id, lot_number')
      .eq('jobsite_id', siteId)
      .order('lot_number')

    if (!houses?.length) {
      setLots([])
      setLoading(false)
      return
    }

    setLots(houses)

    const houseIds = houses.map(h => h.id)

    // Get schedules for these houses
    const { data: schedules } = await supabase
      .from('frm_schedules')
      .select('id, lot_id')
      .in('lot_id', houseIds)

    const scheduleIds = (schedules || []).map(s => s.id)
    const scheduleToHouse = new Map((schedules || []).map(s => [s.id, s.lot_id]))

    // Get schedule phases with completion dates
    const { data: phases } = await supabase
      .from('frm_schedule_phases')
      .select('schedule_id, phase_id, status, actual_end_date, notes')
      .in('schedule_id', scheduleIds)

    // Get phase definitions — match by name (phases now exist in DB with exact Avalon names)
    const { data: phaseDefs } = await supabase
      .from('ref_eagle_phases')
      .select('id, name, sheet_section')
      .in('sheet_section', ['construction', 'documentation'])

    // Build lookup: phase_id → item key (using exact name match to ALL_ITEMS)
    const phaseIdToItemKey = new Map<string, string>()
    for (const p of phaseDefs || []) {
      const pName = p.name?.toLowerCase() || ''
      for (const item of ALL_ITEMS) {
        if (item.label.toLowerCase() === pName) {
          phaseIdToItemKey.set(p.id, item.key)
          break
        }
      }
    }

    // Build data map: { houseId: { itemKey: dateString } }
    const dataMap: Record<string, Record<string, string>> = {}
    for (const h of houses) {
      dataMap[h.id] = {}
    }

    for (const sp of phases || []) {
      const houseId = scheduleToHouse.get(sp.schedule_id)
      if (!houseId || !dataMap[houseId]) continue

      const itemKey = phaseIdToItemKey.get(sp.phase_id)
      if (!itemKey) continue

      if (sp.actual_end_date) {
        dataMap[houseId][itemKey] = new Date(sp.actual_end_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
      } else if (sp.status === 'in_progress') {
        dataMap[houseId][itemKey] = '...'
      }
    }

    setData(dataMap)
    setLoading(false)
  }, [siteId])

  useEffect(() => { loadData() }, [loadData])

  const handleExport = () => {
    if (!lots.length) return
    const headers = ['Item', ...lots.map(l => l.lot_number)]
    const csvRows = ALL_ITEMS.map(item => [
      item.label,
      ...lots.map(l => data[l.id]?.[item.key] || ''),
    ])
    const csv = [
      `Management Sheet - ${siteName}`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `management-${siteName.replace(/\s+/g, '-').toLowerCase()}.csv`
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
        <p className="text-sm text-[#86868B] mt-1">Add lots to see the Management matrix.</p>
      </div>
    )
  }

  // Count filled cells per section
  const sectionCounts = SECTIONS.map(section => {
    const sectionItems = ALL_ITEMS.filter(i => i.sectionId === section.id)
    let filled = 0
    let total = sectionItems.length * lots.length
    for (const item of sectionItems) {
      for (const lot of lots) {
        if (data[lot.id]?.[item.key]) filled++
      }
    }
    return { id: section.id, filled, total }
  })

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-[#1D1D1F]">{lots.length} lots</span>
          {SECTIONS.map((section, i) => {
            const count = sectionCounts[i]
            return (
              <span key={section.id} className="text-xs font-medium" style={{ color: section.color }}>
                {section.label}: {count.filled}/{count.total}
              </span>
            )
          })}
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-[#0056B3] transition">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl border border-[#D2D2D7] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F5F5F7] border-b border-[#D2D2D7]">
              <th className="text-left text-xs font-semibold text-[#86868B] uppercase px-3 py-3 sticky left-0 bg-[#F5F5F7] z-10 min-w-[200px]">
                Item
              </th>
              {lots.map(lot => (
                <th key={lot.id} className="text-center text-xs font-semibold text-[#86868B] px-1 py-3 min-w-[50px]">
                  {lot.lot_number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map(section => {
              const isCollapsed = collapsedSections.has(section.id)
              const sectionItems = ALL_ITEMS.filter(i => i.sectionId === section.id)
              return (
                <Fragment key={section.id}>
                  {/* Section Header Row */}
                  <tr
                    className="cursor-pointer hover:bg-[#F9F9FB]"
                    onClick={() => toggleSection(section.id)}
                  >
                    <td
                      className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider sticky left-0 bg-white z-10"
                      style={{ color: section.color }}
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed
                          ? <ChevronRight className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />
                        }
                        {section.label} ({sectionItems.length})
                      </div>
                    </td>
                    <td colSpan={lots.length} className="px-1 py-2.5">
                      <div className="h-[1px]" style={{ backgroundColor: section.color + '30' }} />
                    </td>
                  </tr>
                  {/* Items */}
                  {!isCollapsed && sectionItems.map(item => (
                    <tr key={item.key} className="border-b border-[#F0F0F2] hover:bg-[#F9F9FB]">
                      <td className="px-3 py-1.5 text-sm text-[#1D1D1F] sticky left-0 bg-white z-10 whitespace-nowrap">
                        {item.label}
                      </td>
                      {lots.map(lot => {
                        const val = data[lot.id]?.[item.key]
                        return (
                          <td key={lot.id} className="px-1 py-1.5 text-center">
                            {val ? (
                              <span className={`text-[10px] tabular-nums ${
                                val === '...' ? 'text-[#007AFF]' : 'text-[#34C759] font-medium'
                              }`}>
                                {val}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#E5E5EA]">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

