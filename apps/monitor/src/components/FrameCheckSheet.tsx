'use client'

/**
 * Frame Check Sheet — 140+ inspection items in 8 categories.
 * Mirrors Avalon CONTROL "FRAME-CHECK" tab exactly.
 * Lot selector at top → checklist with pass/fail per item.
 */

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Loader2, Download, AlertTriangle, ChevronDown, ChevronRight, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FrameCheckSheetProps {
  siteId: string
  siteName: string
}

interface LotOption {
  id: string
  lot_number: string
}

// Inspection categories and items — exactly from Avalon CONTROL FRAME-CHECK tab
const INSPECTION_CATEGORIES = [
  {
    id: 'RA',
    label: 'ROOF AND ATTIC',
    color: '#007AFF',
    items: [
      { code: 'RA01', label: 'Roof sheathing properly nailed (8" OC edges, 12" OC field)' },
      { code: 'RA02', label: 'H-clips installed between sheathing panels' },
      { code: 'RA03', label: 'Roof sheathing gaps (1/8" min)' },
      { code: 'RA04', label: 'Truss bracing installed per engineer specs' },
      { code: 'RA05', label: 'Ridge beam properly supported' },
      { code: 'RA06', label: 'Hurricane ties/straps at truss-to-plate connections' },
      { code: 'RA07', label: 'Attic access framing complete' },
      { code: 'RA08', label: 'Collar ties installed where required' },
      { code: 'RA09', label: 'Truss webbing not cut or altered' },
      { code: 'RA10', label: 'Roof ventilation openings maintained' },
      { code: 'RA11', label: 'Valley/hip rafter connections secure' },
      { code: 'RA12', label: 'Fascia board straight and secure' },
      { code: 'RA13', label: 'Soffit backing installed' },
      { code: 'RA14', label: 'Plywood clips/blocking at all edges' },
      { code: 'RA15', label: 'Drip edge flashing installed' },
      { code: 'RA16', label: 'Ice & water shield at eaves' },
      { code: 'RA17', label: 'Chimney/vent flashing framing' },
      { code: 'RA18', label: 'Attic insulation baffles in place' },
      { code: 'RA19', label: 'Cathedral ceiling properly framed' },
      { code: 'RA20', label: 'Skylight framing per specs' },
      { code: 'RA21', label: 'Roof pitch matches plans' },
      { code: 'RA22', label: 'Overhang dimensions correct' },
      { code: 'RA23', label: 'All truss hangers installed' },
    ],
  },
  {
    id: 'SF',
    label: 'SECOND FLOOR DECK',
    color: '#34C759',
    items: [
      { code: 'SF01', label: 'Floor joists properly spaced (16" OC)' },
      { code: 'SF02', label: 'Joist hangers at all connections' },
      { code: 'SF03', label: 'Subfloor glued and screwed/nailed' },
      { code: 'SF04', label: 'Subfloor joints staggered' },
      { code: 'SF05', label: 'Bridging/blocking between joists' },
      { code: 'SF06', label: 'Load-bearing walls aligned below' },
      { code: 'SF07', label: 'Double joists under parallel walls' },
      { code: 'SF08', label: 'Rim joist/band board secure' },
      { code: 'SF09', label: 'Cantilever framing per specs' },
      { code: 'SF10', label: 'Floor level and flat (1/4" per 10ft max)' },
      { code: 'SF11', label: 'Plumbing/HVAC openings properly headed' },
      { code: 'SF12', label: 'Squash blocks under point loads' },
      { code: 'SF13', label: 'Steel beam connections verified' },
      { code: 'SF14', label: 'Post-to-beam connections per specs' },
      { code: 'SF15', label: 'Web stiffeners installed where required' },
      { code: 'SF16', label: 'TJI rim board properly fastened' },
      { code: 'SF17', label: 'Subfloor type/thickness matches plans' },
    ],
  },
  {
    id: 'MW',
    label: 'MAIN FLOOR WALLS',
    color: '#FF9500',
    items: [
      { code: 'MW01', label: 'Wall plates anchored to foundation' },
      { code: 'MW02', label: 'Stud spacing correct (16" or 24" OC)' },
      { code: 'MW03', label: 'Headers over openings per specs' },
      { code: 'MW04', label: 'Jack studs/trimmers at all openings' },
      { code: 'MW05', label: 'Cripple studs above/below openings' },
      { code: 'MW06', label: 'Corner framing complete (3-stud or L)' },
      { code: 'MW07', label: 'Wall plumb (1/4" per 8ft max)' },
      { code: 'MW08', label: 'Double top plate with staggered joints' },
      { code: 'MW09', label: 'Partition wall intersections backed' },
      { code: 'MW10', label: 'Blocking for fixtures/cabinets' },
      { code: 'MW11', label: 'Fire stops at floor/ceiling' },
      { code: 'MW12', label: 'Shear wall nailing per specs' },
      { code: 'MW13', label: 'Hold-down hardware installed' },
      { code: 'MW14', label: 'Point load bearing path continuous' },
      { code: 'MW15', label: 'Window/door rough openings correct' },
      { code: 'MW16', label: 'Exterior sheathing properly nailed' },
      { code: 'MW17', label: 'Vapor barrier/house wrap ready' },
      { code: 'MW18', label: 'Electrical/plumbing notches within limits' },
      { code: 'MW19', label: 'Sill gasket on foundation plate' },
    ],
  },
  {
    id: 'SW',
    label: 'SECOND FLOOR WALLS',
    color: '#AF52DE',
    items: [
      { code: 'SW01', label: 'Wall plates aligned with floor joists below' },
      { code: 'SW02', label: 'Stud spacing matches plans' },
      { code: 'SW03', label: 'Headers sized correctly' },
      { code: 'SW04', label: 'Jack studs at all openings' },
      { code: 'SW05', label: 'Corner framing complete' },
      { code: 'SW06', label: 'Walls plumb and straight' },
      { code: 'SW07', label: 'Double top plate installed' },
      { code: 'SW08', label: 'Top plate joints staggered from below' },
      { code: 'SW09', label: 'Interior partition backing' },
      { code: 'SW10', label: 'Blocking for fixtures' },
      { code: 'SW11', label: 'Fire stops installed' },
      { code: 'SW12', label: 'Shear wall compliance' },
      { code: 'SW13', label: 'Hold-down hardware' },
      { code: 'SW14', label: 'Load path continuity' },
      { code: 'SW15', label: 'Rough openings per schedule' },
      { code: 'SW16', label: 'Exterior sheathing nailed' },
      { code: 'SW17', label: 'Balloon framing ties (if applicable)' },
      { code: 'SW18', label: 'Dormer framing per plans' },
      { code: 'SW19', label: 'Gable end framing complete' },
      { code: 'SW20', label: 'Knee walls braced' },
      { code: 'SW21', label: 'Party wall (if applicable) per code' },
      { code: 'SW22', label: 'Attic access framing at walls' },
      { code: 'SW23', label: 'Ceiling backing for drywall' },
      { code: 'SW24', label: 'Notch/hole limits respected' },
      { code: 'SW25', label: 'Strapping at ceiling' },
    ],
  },
  {
    id: 'ST',
    label: 'STAIRS',
    color: '#FF2D55',
    items: [
      { code: 'ST01', label: 'Stringer cut properly (min 3.5" throat)' },
      { code: 'ST02', label: 'Rise uniform (max 7-3/4", 3/8" tolerance)' },
      { code: 'ST03', label: 'Run uniform (min 10", 3/8" tolerance)' },
      { code: 'ST04', label: 'Headroom clearance (min 6\'-8")' },
      { code: 'ST05', label: 'Stringer connections secure (top and bottom)' },
      { code: 'ST06', label: 'Handrail height correct (34"-38")' },
      { code: 'ST07', label: 'Guard height correct (36" min)' },
      { code: 'ST08', label: 'Baluster spacing (max 4" clear)' },
      { code: 'ST09', label: 'Landing size adequate (min width of stair)' },
      { code: 'ST10', label: 'Winder treads per code (if applicable)' },
      { code: 'ST11', label: 'Stair width min 36" clear' },
      { code: 'ST12', label: 'Nosing projection consistent' },
      { code: 'ST13', label: 'Temporary stair safe for use' },
      { code: 'ST14', label: 'Basement stair headroom' },
      { code: 'ST15', label: 'Fire separation at stairwell' },
    ],
  },
  {
    id: 'MF',
    label: 'MAIN FLOOR DECK',
    color: '#5856D6',
    items: [
      { code: 'MF01', label: 'Sill plate properly anchored' },
      { code: 'MF02', label: 'Anchor bolt spacing per code' },
      { code: 'MF03', label: 'Floor joist spacing correct' },
      { code: 'MF04', label: 'Joist hangers at beam connections' },
      { code: 'MF05', label: 'Subfloor glued and nailed' },
      { code: 'MF06', label: 'Subfloor joints staggered' },
      { code: 'MF07', label: 'Bridging installed' },
      { code: 'MF08', label: 'Beam/girder size per plans' },
      { code: 'MF09', label: 'Beam bearing on foundation (min 3")' },
      { code: 'MF10', label: 'Lally columns/posts plumb and secured' },
      { code: 'MF11', label: 'Rim joist continuous and fastened' },
      { code: 'MF12', label: 'Cantilever per specs (2:1 ratio)' },
      { code: 'MF13', label: 'Floor level (string line check)' },
      { code: 'MF14', label: 'Openings properly headed' },
      { code: 'MF15', label: 'Squash blocks at point loads' },
      { code: 'MF16', label: 'Steel beam connections' },
      { code: 'MF17', label: 'Post caps/bases installed' },
      { code: 'MF18', label: 'Web stiffeners at reactions' },
      { code: 'MF19', label: 'Blocking at bearing walls' },
      { code: 'MF20', label: 'Sill gasket continuous' },
      { code: 'MF21', label: 'Termite shield (if required)' },
      { code: 'MF22', label: 'Floor thickness/type matches plans' },
      { code: 'MF23', label: 'Notch/bore limits respected' },
      { code: 'MF24', label: 'Fireplace support framing' },
    ],
  },
  {
    id: 'OS',
    label: 'OUTSIDE',
    color: '#00C7BE',
    items: [
      { code: 'OS01', label: 'Foundation straight and level' },
      { code: 'OS02', label: 'Backfill grade slopes away from house' },
      { code: 'OS03', label: 'Window wells installed (if required)' },
      { code: 'OS04', label: 'Exterior door thresholds level' },
      { code: 'OS05', label: 'Garage slab prep/grade correct' },
      { code: 'OS06', label: 'Porch/deck framing per plans' },
      { code: 'OS07', label: 'Exterior stairs/steps per code' },
      { code: 'OS08', label: 'Driveway clearance maintained' },
      { code: 'OS09', label: 'Downspout extensions in place' },
      { code: 'OS10', label: 'Site clean and organized' },
      { code: 'OS11', label: 'Temporary erosion control maintained' },
    ],
  },
  {
    id: 'GR',
    label: 'GENERAL',
    color: '#8E8E93',
    items: [
      { code: 'GR01', label: 'All nailing per code (type, spacing, penetration)' },
      { code: 'GR02', label: 'Lumber grade stamps visible and correct' },
      { code: 'GR03', label: 'Safety: fall protection, guardrails, clean site' },
    ],
  },
]

const TOTAL_ITEMS = INSPECTION_CATEGORIES.reduce((s, c) => s + c.items.length, 0)

export default function FrameCheckSheet({ siteId, siteName }: FrameCheckSheetProps) {
  const [loading, setLoading] = useState(true)
  const [lots, setLots] = useState<LotOption[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>('')
  const [results, setResults] = useState<Record<string, 'pass' | 'fail'>>({})
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const loadLots = useCallback(async () => {
    setLoading(true)
    const { data: houses } = await supabase
      .from('egl_houses')
      .select('id, lot_number')
      .eq('site_id', siteId)
      .order('lot_number')

    setLots(houses || [])
    if (houses?.length && !selectedLotId) {
      setSelectedLotId(houses[0].id)
    }
    setLoading(false)
  }, [siteId])

  // Load inspection data for selected lot
  const loadInspection = useCallback(async () => {
    if (!selectedLotId) return

    // Try to load inspection results from egl_progress or dedicated table
    const { data: progress } = await supabase
      .from('egl_progress')
      .select('phase_id, status, notes')
      .eq('house_id', selectedLotId)

    // Map phase results to inspection items (best-effort matching)
    const resultMap: Record<string, 'pass' | 'fail'> = {}
    // For now, inspection items don't have direct DB mapping
    // They'll populate as the Frame Check system is built out
    if (progress) {
      for (const p of progress) {
        if (p.status === 'approved') {
          // Mark related items as pass (placeholder logic)
        }
      }
    }
    setResults(resultMap)
  }, [selectedLotId])

  useEffect(() => { loadLots() }, [loadLots])
  useEffect(() => { loadInspection() }, [loadInspection])

  const passCount = Object.values(results).filter(v => v === 'pass').length
  const failCount = Object.values(results).filter(v => v === 'fail').length
  const pendingCount = TOTAL_ITEMS - passCount - failCount

  const selectedLot = lots.find(l => l.id === selectedLotId)

  const handleExport = () => {
    if (!selectedLot) return
    const headers = ['Code', 'Category', 'Item', 'Result']
    const csvRows = INSPECTION_CATEGORIES.flatMap(cat =>
      cat.items.map(item => [
        item.code, cat.label, item.label,
        results[item.code] || 'pending',
      ])
    )
    const csv = [
      `Frame Check - ${siteName} - Lot ${selectedLot.lot_number}`,
      `${passCount} pass, ${failCount} fail, ${pendingCount} pending`,
      '',
      headers.join(','),
      ...csvRows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frame-check-${siteName.replace(/\s+/g, '-').toLowerCase()}-lot-${selectedLot.lot_number}.csv`
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
        <p className="text-sm text-[#86868B] mt-1">Add lots to use Frame Check.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header: Lot Selector + Stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <select
            value={selectedLotId}
            onChange={(e) => setSelectedLotId(e.target.value)}
            className="px-3 py-2 bg-white border border-[#D2D2D7] rounded-lg text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] cursor-pointer"
          >
            {lots.map(l => (
              <option key={l.id} value={l.id}>Lot {l.lot_number}</option>
            ))}
          </select>
          <span className="text-xs text-[#86868B]">{TOTAL_ITEMS} items in {INSPECTION_CATEGORIES.length} categories</span>
          {passCount > 0 && <span className="text-xs font-medium text-[#34C759]">{passCount} pass</span>}
          {failCount > 0 && <span className="text-xs font-medium text-[#FF3B30]">{failCount} fail</span>}
          {pendingCount > 0 && <span className="text-xs text-[#86868B]">{pendingCount} pending</span>}
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-[#0056B3] transition">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-[#D2D2D7] p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[#6E6E73]">Overall Progress</span>
          <span className="font-medium text-[#1D1D1F]">
            {passCount + failCount}/{TOTAL_ITEMS} ({TOTAL_ITEMS > 0 ? Math.round(((passCount + failCount) / TOTAL_ITEMS) * 100) : 0}%)
          </span>
        </div>
        <div className="h-3 bg-[#E5E5EA] rounded-full overflow-hidden flex">
          {passCount > 0 && (
            <div className="h-full bg-[#34C759]" style={{ width: `${(passCount / TOTAL_ITEMS) * 100}%` }} />
          )}
          {failCount > 0 && (
            <div className="h-full bg-[#FF3B30]" style={{ width: `${(failCount / TOTAL_ITEMS) * 100}%` }} />
          )}
        </div>
      </div>

      {/* Inspection Categories */}
      <div className="space-y-2">
        {INSPECTION_CATEGORIES.map(cat => {
          const isCollapsed = collapsedCategories.has(cat.id)
          const catPass = cat.items.filter(i => results[i.code] === 'pass').length
          const catFail = cat.items.filter(i => results[i.code] === 'fail').length
          const catPending = cat.items.length - catPass - catFail

          return (
            <div key={cat.id} className="bg-white rounded-xl border border-[#D2D2D7] overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F9F9FB] transition"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4 text-[#86868B]" />
                    : <ChevronDown className="w-4 h-4 text-[#86868B]" />
                  }
                  <span className="text-sm font-bold" style={{ color: cat.color }}>
                    {cat.label}
                  </span>
                  <span className="text-xs text-[#86868B]">
                    ({cat.id}01-{cat.id}{String(cat.items.length).padStart(2, '0')})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {catPass > 0 && <span className="font-medium text-[#34C759]">{catPass} pass</span>}
                  {catFail > 0 && <span className="font-medium text-[#FF3B30]">{catFail} fail</span>}
                  <span className="text-[#86868B]">{catPending} pending</span>
                </div>
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="border-t border-[#E5E5EA]">
                  {cat.items.map(item => {
                    const result = results[item.code]
                    return (
                      <div key={item.code} className="flex items-center px-4 py-2.5 border-b border-[#F0F0F2] last:border-b-0 hover:bg-[#F9F9FB]">
                        <span className="text-xs font-mono text-[#86868B] w-12 shrink-0">{item.code}</span>
                        <span className="text-sm text-[#1D1D1F] flex-1">{item.label}</span>
                        <div className="flex items-center gap-1.5 ml-3">
                          {result === 'pass' ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-[#34C759] bg-[#34C759]/10 px-2 py-1 rounded">
                              <Check className="w-3.5 h-3.5" />PASS
                            </span>
                          ) : result === 'fail' ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-1 rounded">
                              <X className="w-3.5 h-3.5" />FAIL
                            </span>
                          ) : (
                            <span className="text-xs text-[#AEAEB2] bg-[#F5F5F7] px-2 py-1 rounded">—</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
