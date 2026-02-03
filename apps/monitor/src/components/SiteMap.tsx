'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { House, TimelineEvent, Issue } from '@onsite/shared'
import {
  STATUS_CONFIG,
  EVENT_CONFIG,
  getStatusConfig,
  getEventConfig,
  type EventType,
  type HouseStatus
} from '@onsite/shared'
import {
  Camera,
  AlertTriangle,
  ClipboardCheck,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Mail,
  Calendar,
  Bell,
  UserPlus,
  Flag,
  FileText,
  X,
  ChevronRight
} from 'lucide-react'

interface SiteMapProps {
  siteId?: string
  svgData?: string
  houses?: House[]
  events?: TimelineEvent[]
  issues?: Issue[]
  onHouseClick?: (house: House) => void
  editable?: boolean
}

// Icon mapping for dynamic rendering
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Camera,
  AlertTriangle,
  ClipboardCheck,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Mail,
  Calendar,
  Bell,
  UserPlus,
  Flag,
  FileText,
}

// Light theme status colors
const LIGHT_STATUS_COLORS: Record<HouseStatus, string> = {
  not_started: STATUS_CONFIG.not_started.color,
  in_progress: STATUS_CONFIG.in_progress.color,
  delayed: STATUS_CONFIG.delayed.color,
  completed: STATUS_CONFIG.completed.color,
  on_hold: STATUS_CONFIG.on_hold.color,
}

export default function SiteMap({
  siteId,
  svgData: initialSvg,
  houses: initialHouses,
  events: initialEvents = [],
  issues: initialIssues = [],
  onHouseClick,
  editable = false
}: SiteMapProps) {
  const router = useRouter()
  const [svg, setSvg] = useState<string>(initialSvg || '')
  const [houses, setHouses] = useState<House[]>(initialHouses || [])
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents)
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null)
  const [loading, setLoading] = useState(!initialSvg && !!siteId)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch site data if siteId provided
  useEffect(() => {
    if (siteId && !initialSvg) {
      fetchSiteData()
    }
  }, [siteId])

  const fetchSiteData = async () => {
    if (!siteId) return

    setLoading(true)
    try {
      // Fetch site SVG
      const { data: site } = await supabase
        .from('egl_sites')
        .select('svg_data')
        .eq('id', siteId)
        .single()

      if (site?.svg_data) {
        setSvg(site.svg_data)
      }

      // Fetch houses
      const { data: housesData } = await supabase
        .from('egl_houses')
        .select('*')
        .eq('site_id', siteId)
        .order('lot_number')

      if (housesData) {
        setHouses(housesData)
      }

      // Fetch timeline events for all houses in site
      const { data: eventsData } = await supabase
        .from('egl_timeline')
        .select('*')
        .in('house_id', housesData?.map(h => h.id) || [])
        .order('created_at', { ascending: false })
        .limit(100)

      if (eventsData) {
        setEvents(eventsData)
      }

      // Fetch issues for all houses in site
      const { data: issuesData } = await supabase
        .from('egl_issues')
        .select('*')
        .in('house_id', housesData?.map(h => h.id) || [])
        .eq('status', 'open')

      if (issuesData) {
        setIssues(issuesData)
      }
    } catch (error) {
      console.error('Error fetching site data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update SVG with house statuses
  useEffect(() => {
    if (!svg || !containerRef.current) return

    const container = containerRef.current

    // Add click handlers and update colors
    setTimeout(() => {
      const lotElements = container.querySelectorAll('.lot')

      lotElements.forEach((lot) => {
        const lotNumber = lot.getAttribute('data-lot')
        const house = houses.find(h => h.lot_number === lotNumber)

        if (house) {
          const rect = lot.querySelector('.lot-rect')
          if (rect) {
            rect.setAttribute('fill', LIGHT_STATUS_COLORS[house.status] || LIGHT_STATUS_COLORS.not_started)
            rect.setAttribute('data-house-id', house.id)
          }

          // Add click handler
          lot.addEventListener('click', () => handleLotClick(house))
        }
      })
    }, 100)
  }, [svg, houses])

  // Get events for a specific house
  const getHouseEvents = (houseId: string) => {
    return events
      .filter(e => e.house_id === houseId)
      .slice(0, 3)
  }

  // Get open issues count for a house
  const getOpenIssuesCount = (houseId: string) => {
    return issues.filter(i => i.house_id === houseId && i.status === 'open').length
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Render event icon
  const renderEventIcon = (eventType: EventType) => {
    const config = getEventConfig(eventType)
    const IconComponent = ICON_MAP[config.icon]
    if (!IconComponent) return null
    return <IconComponent className="w-3.5 h-3.5" style={{ color: config.color }} />
  }

  const handleLotClick = (house: House) => {
    setSelectedHouse(house)
    if (onHouseClick) {
      onHouseClick(house)
    }
  }

  const handleViewDetails = (house: House) => {
    if (siteId) {
      router.push(`/site/${siteId}/lot/${house.id}`)
    } else if (onHouseClick) {
      onHouseClick(house)
    }
  }

  // Handle escape key to close popup
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedHouse(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-[#F5F5F7] rounded-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]"></div>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-[#F5F5F7] rounded-xl text-[#6E6E73]">
        <p className="text-[#1D1D1F] font-medium">No site map available</p>
        <p className="text-sm mt-2">Upload a subdivision plan to generate the map</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* SVG Map */}
      <div
        ref={containerRef}
        className="bg-white rounded-xl shadow-sm border border-[#D2D2D7] overflow-hidden"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {/* Selected House Popup */}
      {selectedHouse && (
        <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg border border-[#D2D2D7] w-80 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5EA]">
            <h4 className="font-semibold text-[#1D1D1F] text-lg">Lot {selectedHouse.lot_number}</h4>
            <button
              onClick={() => setSelectedHouse(null)}
              className="text-[#8E8E93] hover:text-[#6E6E73] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Status & Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#6E6E73] text-sm">Status</span>
                <span
                  className="font-medium text-sm px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: LIGHT_STATUS_COLORS[selectedHouse.status] + '20',
                    color: LIGHT_STATUS_COLORS[selectedHouse.status]
                  }}
                >
                  {getStatusConfig(selectedHouse.status).label}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#6E6E73] text-sm">Progress</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedHouse.progress_percentage}%`,
                        backgroundColor: '#007AFF'
                      }}
                    />
                  </div>
                  <span className="font-medium text-sm text-[#1D1D1F]">{selectedHouse.progress_percentage}%</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#6E6E73] text-sm">Phase</span>
                <span className="font-medium text-sm text-[#1D1D1F]">{selectedHouse.current_phase}/7</span>
              </div>
            </div>

            {/* Recent Activity */}
            {getHouseEvents(selectedHouse.id).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                  Recent Activity
                </div>
                <div className="space-y-2">
                  {getHouseEvents(selectedHouse.id).map((event) => (
                    <div key={event.id} className="flex items-center gap-2.5">
                      {renderEventIcon(event.event_type as EventType)}
                      <span className="text-sm text-[#1D1D1F] flex-1 truncate">{event.title}</span>
                      <span className="text-xs text-[#8E8E93]">{formatRelativeTime(event.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open Issues Badge */}
            {getOpenIssuesCount(selectedHouse.id) > 0 && (
              <div className="flex items-center gap-2 bg-[#FF3B30]/10 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
                <span className="text-sm font-medium text-[#FF3B30]">
                  {getOpenIssuesCount(selectedHouse.id)} open issue{getOpenIssuesCount(selectedHouse.id) !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#E5E5EA] bg-[#F5F5F7]">
            <button
              onClick={() => handleViewDetails(selectedHouse)}
              className="w-full bg-[#007AFF] hover:bg-[#0066CC] text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              View Details
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-[#D2D2D7] p-4">
        <div className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide mb-3">Status Legend</div>
        <div className="space-y-2">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2.5">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-sm text-[#1D1D1F]">
                {config.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
