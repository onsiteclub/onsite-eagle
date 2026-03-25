'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Building2,
  Home,
  Shield,
  Activity,
  MapPin,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BuilderJobsite {
  name: string
  builder_name: string
  city: string
  svg_data: string | null
  total_lots: number
  completed_lots: number
  status: string
  start_date: string | null
  expected_end_date: string | null
}

interface BuilderLot {
  id: string
  lot_number: string
  status: string
  current_phase: string | null
  coordinates: { x: number; y: number; width?: number; height?: number } | null
}

interface BuilderMilestone {
  title: string
  date: string
  type: string
}

interface BuilderStats {
  phases: Record<string, number>
  safety_open: number
}

interface BuilderData {
  valid: boolean
  error?: string
  builder_name?: string
  jobsite?: BuilderJobsite
  lots?: BuilderLot[]
  stats?: BuilderStats
  milestones?: BuilderMilestone[]
  timestamp?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHASE_ORDER = [
  'capping',
  'floor_1',
  'walls_1',
  'floor_2',
  'walls_2',
  'roof',
  'backframe_basement',
  'backframe_strapping',
  'backframe_backing',
]

const PHASE_LABELS: Record<string, string> = {
  capping: 'Capping',
  floor_1: 'First Floor',
  walls_1: 'First Floor Walls',
  floor_2: 'Second Floor',
  walls_2: 'Second Floor Walls',
  roof: 'Roof',
  backframe_basement: 'Backframe Basement',
  backframe_strapping: 'Backframe Strapping',
  backframe_backing: 'Backframe Backing',
}

const PHASE_COLORS: Record<string, string> = {
  capping: '#9CA3AF',
  floor_1: '#3B82F6',
  walls_1: '#6366F1',
  floor_2: '#8B5CF6',
  walls_2: '#A855F7',
  roof: '#EC4899',
  backframe_basement: '#F59E0B',
  backframe_strapping: '#F97316',
  backframe_backing: '#EF4444',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:           { bg: '#F3F4F6', text: '#6B7280', label: 'Pending' },
  released:          { bg: '#DBEAFE', text: '#1D4ED8', label: 'Released' },
  in_progress:       { bg: '#D1FAE5', text: '#059669', label: 'In Progress' },
  paused_for_trades: { bg: '#FEF3C7', text: '#D97706', label: 'Paused for Trades' },
  backframe:         { bg: '#EDE9FE', text: '#7C3AED', label: 'Backframe' },
  inspection:        { bg: '#FCE7F3', text: '#DB2777', label: 'Inspection' },
  completed:         { bg: '#D1FAE5', text: '#059669', label: 'Completed' },
}

const SVG_STATUS_COLORS: Record<string, string> = {
  pending: '#E5E7EB',
  released: '#93C5FD',
  in_progress: '#6EE7B7',
  paused_for_trades: '#FCD34D',
  backframe: '#C4B5FD',
  inspection: '#F9A8D4',
  completed: '#34D399',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeProgress(currentPhase: string | null, status: string): number {
  if (status === 'completed') return 100
  if (status === 'pending' || !currentPhase) return 0
  const idx = PHASE_ORDER.indexOf(currentPhase)
  if (idx < 0) return 0
  return Math.round(((idx + 0.5) / PHASE_ORDER.length) * 100)
}

function getStatusStyle(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.pending
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 30) return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffMinutes > 0) return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function createRealtimeClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const style = getStatusStyle(status)
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: '#0F766E' }}
        />
      </div>
      <span className="text-xs text-gray-500 font-medium w-9 text-right">{value}%</span>
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType
  value: number
  label: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg mb-3" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function ErrorPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-8">{description}</p>
        <a
          href="https://onsiteclub.ca"
          className="inline-flex items-center gap-2 text-sm text-[#0F766E] hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          Go to OnSite Club
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BuilderPortalPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<BuilderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isLive, setIsLive] = useState(false)
  const [hoveredLot, setHoveredLot] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  // Locally-managed lots state so realtime updates flow immediately
  const [lots, setLots] = useState<BuilderLot[]>([])

  // -----------------------------------------------------------------------
  // Fetch data
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/builder/${token}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const json: BuilderData = await response.json()
      setData(json)
      if (json.lots) setLots(json.lots)
      setLastUpdate(new Date())
    } catch {
      setData({ valid: false, error: 'Failed to load project data. Please try again later.' })
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // -----------------------------------------------------------------------
  // Realtime subscription
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!data?.valid || !data.jobsite) return

    const supabase = createRealtimeClient()
    if (!supabase) return

    // We need the jobsite id to filter. Derive it from the first lot or skip.
    // The API gives us lots with jobsite_id implicitly. We subscribe broadly
    // and match by checking lot ids we already know about.
    const lotIds = new Set(lots.map((l) => l.id))

    const channel = supabase
      .channel(`builder-${token}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'frm_lots',
        },
        (payload) => {
          const record = (payload.new || payload.old) as Record<string, unknown> | undefined
          if (!record) return

          const id = record.id as string
          // Only process lots that belong to this jobsite
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated: BuilderLot = {
              id: record.id as string,
              lot_number: record.lot_number as string,
              status: record.status as string,
              current_phase: (record.current_phase as string) || null,
              coordinates: record.coordinates as BuilderLot['coordinates'],
            }

            setLots((prev) => {
              const idx = prev.findIndex((l) => l.id === id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = updated
                return next
              }
              // New lot for this jobsite — only add if it was already in our set
              if (lotIds.has(id)) return [...prev, updated]
              return prev
            })
            setLastUpdate(new Date())
          } else if (payload.eventType === 'DELETE') {
            setLots((prev) => prev.filter((l) => l.id !== id))
            setLastUpdate(new Date())
          }
        },
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.valid, token])

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const sortedLots = useMemo(
    () => [...lots].sort((a, b) => naturalSort(a.lot_number, b.lot_number)),
    [lots],
  )

  const computedStats = useMemo(() => {
    const totalLots = lots.length
    const inProgress = lots.filter((l) => l.status === 'in_progress').length
    const completed = lots.filter((l) => l.status === 'completed').length
    const safetyOpen = data?.stats?.safety_open ?? 0
    return { totalLots, inProgress, completed, safetyOpen }
  }, [lots, data?.stats?.safety_open])

  const phaseDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const phase of PHASE_ORDER) counts[phase] = 0
    for (const lot of lots) {
      if (lot.current_phase && lot.current_phase in counts) {
        counts[lot.current_phase]++
      }
    }
    return counts
  }, [lots])

  const phaseTotal = useMemo(
    () => Object.values(phaseDistribution).reduce((s, v) => s + v, 0),
    [phaseDistribution],
  )

  const hoveredLotData = useMemo(
    () => (hoveredLot ? lots.find((l) => l.id === hoveredLot) ?? null : null),
    [hoveredLot, lots],
  )

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-[#0F766E] animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading project data...</p>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Error states
  // -----------------------------------------------------------------------

  if (!data || !data.valid) {
    const errorMsg = data?.error || ''

    if (errorMsg.toLowerCase().includes('revoked')) {
      return (
        <ErrorPage
          title="Access Revoked"
          description="This builder link has been revoked by the project administrator."
        />
      )
    }

    if (errorMsg.toLowerCase().includes('expired')) {
      return (
        <ErrorPage
          title="Link Expired"
          description="This builder link has expired. Please contact the project administrator for a new link."
        />
      )
    }

    return (
      <ErrorPage
        title="Invalid Link"
        description="This builder link is invalid or does not exist."
      />
    )
  }

  const jobsite = data.jobsite!
  const milestones = data.milestones ?? []

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F6F7F9]" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* ================================================================
          1. Header Bar
          ================================================================ */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo + subtitle */}
            <div className="flex items-center gap-3">
              <div>
                <span className="text-lg font-bold" style={{ color: '#0F766E' }}>
                  OnSite Eagle
                </span>
                <span className="text-xs text-gray-400 block leading-tight">Builder Portal</span>
              </div>
            </div>

            {/* Center: Jobsite name */}
            <div className="hidden sm:block text-center">
              <h1 className="text-base font-semibold text-gray-900">{jobsite.name}</h1>
              {jobsite.city && (
                <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {jobsite.city}
                </p>
              )}
            </div>

            {/* Right: Live badge + timestamp */}
            <div className="flex items-center gap-3">
              {isLive && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-xs font-semibold text-green-700">LIVE</span>
                </div>
              )}
              <span className="text-xs text-gray-400 hidden md:inline">
                Last updated: {lastUpdate.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={fetchData}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile jobsite name */}
          <div className="sm:hidden mt-2 text-center">
            <h1 className="text-sm font-semibold text-gray-900">{jobsite.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ================================================================
            2. Stats Row
            ================================================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} value={computedStats.totalLots} label="Total Lots" color="#3B82F6" />
          <StatCard icon={Activity} value={computedStats.inProgress} label="In Progress" color="#10B981" />
          <StatCard icon={CheckCircle2} value={computedStats.completed} label="Completed" color="#059669" />
          <StatCard
            icon={Shield}
            value={computedStats.safetyOpen}
            label="Open Safety"
            color={computedStats.safetyOpen > 0 ? '#EF4444' : '#9CA3AF'}
          />
        </div>

        {/* ================================================================
            3. SVG Map Section
            ================================================================ */}
        {jobsite.svg_data && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#0F766E]" />
              Site Map
            </h2>

            <div className="relative">
              {/* Base SVG map */}
              <div
                className="w-full [&_svg]:w-full [&_svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: jobsite.svg_data }}
              />

              {/* Lot overlays */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 1000 562"
                preserveAspectRatio="xMidYMid meet"
              >
                {lots.map((lot) => {
                  if (!lot.coordinates) return null
                  const { x, y, width = 30, height = 30 } = lot.coordinates
                  const fill = SVG_STATUS_COLORS[lot.status] || SVG_STATUS_COLORS.pending
                  const progress = computeProgress(lot.current_phase, lot.status)

                  return (
                    <g
                      key={lot.id}
                      className="pointer-events-auto cursor-pointer"
                      onMouseEnter={(e) => {
                        setHoveredLot(lot.id)
                        const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect()
                        if (rect) {
                          setTooltipPos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top - 40,
                          })
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredLot(null)
                        setTooltipPos(null)
                      }}
                    >
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={fill}
                        fillOpacity={0.75}
                        stroke={hoveredLot === lot.id ? '#0F766E' : '#FFFFFF'}
                        strokeWidth={hoveredLot === lot.id ? 2.5 : 1}
                        rx={3}
                        className="transition-all duration-150"
                      />
                      <text
                        x={x + width / 2}
                        y={y + height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1F2937"
                        fontSize={Math.min(width, height) * 0.35}
                        fontWeight="600"
                        className="pointer-events-none select-none"
                      >
                        {lot.lot_number}
                      </text>
                    </g>
                  )
                })}

                {/* Tooltip */}
                {hoveredLotData && tooltipPos && (
                  <foreignObject
                    x={tooltipPos.x - 80}
                    y={tooltipPos.y - 10}
                    width={160}
                    height={50}
                    className="pointer-events-none"
                  >
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 text-center shadow-lg">
                      <p className="font-semibold">Lot {hoveredLotData.lot_number}</p>
                      <p className="opacity-75">
                        {hoveredLotData.current_phase
                          ? PHASE_LABELS[hoveredLotData.current_phase] || hoveredLotData.current_phase
                          : getStatusStyle(hoveredLotData.status).label}
                        {' -- '}
                        {computeProgress(hoveredLotData.current_phase, hoveredLotData.status)}%
                      </p>
                    </div>
                  </foreignObject>
                )}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
              {Object.entries(STATUS_COLORS).map(([status, style]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{ backgroundColor: SVG_STATUS_COLORS[status] || '#E5E7EB' }}
                  />
                  <span className="text-xs text-gray-500">{style.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            4. Phase Distribution
            ================================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0F766E]" />
            Phase Progress
          </h2>

          {/* Stacked bar */}
          {phaseTotal > 0 ? (
            <div className="h-8 bg-gray-100 rounded-lg overflow-hidden flex">
              {PHASE_ORDER.map((phase) => {
                const count = phaseDistribution[phase] || 0
                if (count === 0) return null
                const widthPct = (count / phaseTotal) * 100
                return (
                  <div
                    key={phase}
                    className="h-full flex items-center justify-center text-white text-xs font-medium transition-all duration-300"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: PHASE_COLORS[phase],
                      minWidth: count > 0 ? '24px' : '0',
                    }}
                    title={`${PHASE_LABELS[phase]}: ${count}`}
                  >
                    {widthPct > 6 ? count : ''}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              No active phases
            </div>
          )}

          {/* Phase labels grid */}
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {PHASE_ORDER.map((phase) => (
              <div key={phase} className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: PHASE_COLORS[phase] }}
                />
                <span className="text-xs text-gray-500 truncate">{PHASE_LABELS[phase]}</span>
                <span className="text-xs font-semibold text-gray-700 ml-auto flex-shrink-0">
                  {phaseDistribution[phase] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================
            5. Lot Table
            ================================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-[#0F766E]" />
            All Lots
            <span className="text-sm font-normal text-gray-400 ml-1">({lots.length})</span>
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Lot #
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Current Phase
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLots.map((lot, i) => {
                  const progress = computeProgress(lot.current_phase, lot.status)
                  return (
                    <tr
                      key={lot.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                        i % 2 === 1 ? 'bg-gray-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-gray-900">{lot.lot_number}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={lot.status} />
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {lot.current_phase ? PHASE_LABELS[lot.current_phase] || lot.current_phase : '--'}
                      </td>
                      <td className="py-3 px-4">
                        <ProgressBar value={progress} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="md:hidden space-y-3">
            {sortedLots.map((lot) => {
              const progress = computeProgress(lot.current_phase, lot.status)
              return (
                <div
                  key={lot.id}
                  className="border border-gray-100 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Lot {lot.lot_number}</span>
                    <StatusBadge status={lot.status} />
                  </div>
                  <div className="text-sm text-gray-500">
                    {lot.current_phase ? PHASE_LABELS[lot.current_phase] || lot.current_phase : 'No active phase'}
                  </div>
                  <ProgressBar value={progress} />
                </div>
              )
            })}
          </div>

          {lots.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <Home className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No lots found</p>
            </div>
          )}
        </div>

        {/* ================================================================
            6. Recent Milestones
            ================================================================ */}
        {milestones.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0F766E]" />
              Recent Activity
            </h2>

            <div className="space-y-3">
              {milestones.slice(0, 20).map((ms, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {ms.type === 'completed' || ms.type === 'completion' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : ms.type === 'inspection' ? (
                      <Shield className="w-4 h-4 text-pink-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1 ml-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{ms.title}</p>
                    <p className="text-xs text-gray-400">{timeAgo(ms.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ================================================================
          7. Footer
          ================================================================ */}
      <footer className="mt-8 py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by OnSite Eagle
        </p>
        <p className="text-xs text-gray-300 mt-1">onsiteclub.ca</p>
      </footer>
    </div>
  )
}
