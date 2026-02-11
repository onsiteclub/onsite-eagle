'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Search, Building2, Settings,
  ChevronRight, ChevronDown, FileText, Shield,
  Users, Home, Plus, Upload,
  MessageSquare, Layers, Lock, Unlock, UserPlus, Loader2,
  X, Check, CalendarDays
} from 'lucide-react'
import AddLotModal from '@/components/AddLotModal'
import BulkDocumentUpload from '@/components/BulkDocumentUpload'
import { supabase } from '@/lib/supabase'
import type { Site, House, HouseStatus } from '@onsite/shared'
import ChatTimeline from '@/components/ChatTimeline'
import { Calendar } from '@onsite/ui/web'
import type { CalendarEvent } from '@onsite/shared'

type ViewType = 'lots' | 'schedule' | 'chat' | 'team' | 'documents'

interface TeamMember {
  id: string
  name: string
  role: 'worker' | 'supervisor' | 'inspector'
  trade?: string
}

// Test team members - will be replaced with real data from database
const TEST_TEAM_MEMBERS: TeamMember[] = [
  { id: 'test-1', name: 'John Smith', role: 'worker', trade: 'Framing' },
  { id: 'test-2', name: 'Carlos Silva', role: 'worker', trade: 'Drywall' },
  { id: 'test-3', name: 'Mike Johnson', role: 'worker', trade: 'Electrical' },
]

interface MenuItem {
  id: string
  label: string
  icon: React.ElementType
  view?: ViewType
  children?: MenuItem[]
}

const STATUS_LABELS: Record<HouseStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed',
  on_hold: 'On Hold',
}

// Light theme status colors
const LIGHT_STATUS_COLORS: Record<HouseStatus, string> = {
  not_started: '#8E8E93',
  in_progress: '#FF9500',
  delayed: '#FF3B30',
  completed: '#34C759',
  on_hold: '#AF52DE',
}

export default function SiteDetail() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteId = params.id as string

  const [site, setSite] = useState<Site | null>(null)
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<ViewType>('lots')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'lot_number' | 'created_at' | 'progress' | 'closing_date' | 'priority'>('lot_number')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showAddLotModal, setShowAddLotModal] = useState(false)
  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [showUploadDocModal, setShowUploadDocModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [showIssueLotModal, setShowIssueLotModal] = useState(false)
  const [selectedLotForIssue, setSelectedLotForIssue] = useState<House | null>(null)

  const handleIssueLot = (house: House) => {
    setSelectedLotForIssue(house)
    setShowIssueLotModal(true)
  }

  // Read tab from URL query params
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      const tabMapping: Record<string, ViewType> = {
        'lots': 'lots',
        'schedule': 'schedule',
        'chat': 'chat',
        'team': 'team',
        'documents': 'documents',
      }
      const mappedView = tabMapping[tab]
      if (mappedView) {
        setActiveView(mappedView)
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (siteId) {
      loadSiteData()
    }
  }, [siteId])

  async function loadSiteData() {
    try {
      console.log('[loadSiteData] Loading site:', siteId)

      // Load site
      const { data: siteData, error: siteError } = await supabase
        .from('egl_sites')
        .select('*')
        .eq('id', siteId)
        .single()

      if (siteError) {
        console.error('[loadSiteData] Error loading site:', siteError)
      } else {
        console.log('[loadSiteData] Site loaded:', siteData?.name)
        setSite(siteData)
      }

      // Load houses
      const { data: housesData, error: housesError } = await supabase
        .from('egl_houses')
        .select('*')
        .eq('site_id', siteId)
        .order('lot_number')

      if (housesError) {
        console.error('[loadSiteData] Error loading houses:', housesError)
      } else {
        console.log('[loadSiteData] Houses loaded:', housesData?.length, 'lots')
        setHouses(housesData || [])

        // Auto-sync total_lots counter if mismatch detected
        const actualCount = housesData?.length || 0
        if (siteData && siteData.total_lots !== actualCount) {
          console.log('[loadSiteData] Counter mismatch detected!', {
            stored: siteData.total_lots,
            actual: actualCount
          })
          // Sync the counter
          const { error: syncError } = await supabase
            .from('egl_sites')
            .update({ total_lots: actualCount })
            .eq('id', siteId)

          if (!syncError) {
            console.log('[loadSiteData] Counter synced to:', actualCount)
            setSite(prev => prev ? { ...prev, total_lots: actualCount } : prev)
          } else {
            console.error('[loadSiteData] Error syncing counter:', syncError)
          }
        }
      }
    } catch (error) {
      console.error('[loadSiteData] Exception:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHouses = useMemo(() => {
    let result = houses.filter(house => {
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return house.lot_number.toLowerCase().includes(query) ||
             (house.address?.toLowerCase().includes(query) ?? false) ||
             (house.buyer_name?.toLowerCase().includes(query) ?? false)
    })

    // Sort
    result.sort((a, b) => {
      let comparison = 0

      if (sortBy === 'lot_number') {
        // Try numeric comparison first, fallback to string
        const numA = parseInt(a.lot_number.replace(/\D/g, '')) || 0
        const numB = parseInt(b.lot_number.replace(/\D/g, '')) || 0
        comparison = numA - numB || a.lot_number.localeCompare(b.lot_number)
      } else if (sortBy === 'created_at') {
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      } else if (sortBy === 'progress') {
        comparison = (a.progress_percentage || 0) - (b.progress_percentage || 0)
      } else if (sortBy === 'closing_date') {
        // Lots with closing dates first, then by date
        const dateA = a.closing_date ? new Date(a.closing_date).getTime() : Infinity
        const dateB = b.closing_date ? new Date(b.closing_date).getTime() : Infinity
        comparison = dateA - dateB
      } else if (sortBy === 'priority') {
        comparison = (b.priority_score || 50) - (a.priority_score || 50) // Higher priority first by default
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [houses, searchQuery, sortBy, sortOrder])

  // Calculate stats for this site
  const stats = useMemo(() => {
    const total = houses.length
    const inProgress = houses.filter(h => h.status === 'in_progress').length
    const completed = houses.filter(h => h.status === 'completed').length
    const delayed = houses.filter(h => h.status === 'delayed').length
    return { total, inProgress, completed, delayed }
  }, [houses])

  // Menu structure - Root items: Lots, Schedule, Timeline, Team, Documents
  const menuItems: MenuItem[] = [
    { id: 'lots', label: 'Lots', icon: Building2, view: 'lots' },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays, view: 'schedule' },
    { id: 'chat', label: 'Timeline', icon: MessageSquare, view: 'chat' },
    { id: 'team', label: 'Team', icon: Users, view: 'team' },
    { id: 'documents', label: 'Documents', icon: FileText, view: 'documents' },
  ]

  const handleMenuClick = (item: MenuItem) => {
    if (item.view) {
      setActiveView(item.view)
    }
  }

  // Get current view title
  const getViewTitle = () => {
    switch (activeView) {
      case 'lots': return 'Lots'
      case 'schedule': return 'Site Schedule'
      case 'chat': return 'Site Timeline'
      case 'team': return 'Team'
      case 'documents': return 'Documents'
      default: return 'Site Detail'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]" />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center">
        <p className="text-[#FF3B30] text-lg mb-4">Jobsite not found</p>
        <button
          onClick={() => router.push('/')}
          className="text-[#007AFF] hover:text-[#0056B3]"
        >
          Back to Overview
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[#D2D2D7] flex flex-col flex-shrink-0">
        {/* Back button and site name */}
        <div className="p-4 border-b border-[#E5E5EA]">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[#007AFF] hover:text-[#0056B3] transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">All Sites</span>
          </button>
          <h1 className="text-lg font-semibold text-[#1D1D1F]">{site.name}</h1>
          <p className="text-sm text-[#86868B] mt-1">{site.address}, {site.city}</p>
        </div>

        {/* Progress */}
        <div className="p-4 border-b border-[#E5E5EA]">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#6E6E73]">Progress</span>
            <span className="text-[#007AFF] font-medium">
              {site.total_lots ? Math.round(((site.completed_lots || 0) / site.total_lots) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#007AFF] rounded-full transition-all"
              style={{
                width: `${site.total_lots ? ((site.completed_lots || 0) / site.total_lots) * 100 : 0}%`
              }}
            />
          </div>
          <p className="text-xs text-[#86868B] mt-2">
            {site.completed_lots || 0} of {site.total_lots || 0} lots completed
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#E5E5EA]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
            <input
              type="text"
              placeholder="Search lots..."
              className="w-full bg-[#F5F5F7] border border-transparent rounded-lg pl-9 pr-3 py-2 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:bg-white transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 p-3 overflow-auto">
          <div className="space-y-1">
            {menuItems.map(menu => (
              <button
                key={menu.id}
                onClick={() => handleMenuClick(menu)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeView === menu.view
                    ? 'bg-[#007AFF]/10 text-[#007AFF]'
                    : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                }`}
              >
                <menu.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{menu.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Settings Card */}
        <div className="p-3 border-t border-[#E5E5EA]">
          <button
            onClick={() => router.push(`/site/${siteId}/settings`)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] transition-colors"
          >
            <div className="w-10 h-10 bg-[#007AFF] rounded-full flex items-center justify-center text-white text-sm font-semibold">
              <Settings className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#1D1D1F]">Settings</p>
              <p className="text-xs text-[#86868B]">Site Info, Rules & More</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#AEAEB2]" />
          </button>
        </div>

        {/* Dates at bottom */}
        <div className="p-4 border-t border-[#E5E5EA]">
          <div className="text-xs text-[#86868B] space-y-1">
            <div className="flex justify-between">
              <span>Start:</span>
              <span className="text-[#1D1D1F]">
                {site.start_date ? new Date(site.start_date).toLocaleDateString('en-CA') : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Expected:</span>
              <span className="text-[#1D1D1F]">
                {site.expected_end_date ? new Date(site.expected_end_date).toLocaleDateString('en-CA') : 'Not set'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-[#D2D2D7] px-6 py-4">
          <h2 className="text-2xl font-semibold text-[#1D1D1F]">{getViewTitle()}</h2>
          <p className="text-sm text-[#86868B]">{site.name}</p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeView === 'lots' && (
            <LotesView
              houses={filteredHouses}
              siteId={siteId}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              onIssueLot={handleIssueLot}
            />
          )}
          {activeView === 'schedule' && (
            <SiteScheduleView siteId={siteId} siteName={site.name} houses={houses} />
          )}
          {activeView === 'chat' && (
            <ChatTimeline
              siteId={siteId}
              siteName={site.name}
              currentUserName="Supervisor"
            />
          )}
          {activeView === 'team' && <SettingsTeamView onAddTeam={() => setShowAddTeamModal(true)} />}
          {activeView === 'documents' && <SettingsDocumentsView onUploadDoc={() => setShowUploadDocModal(true)} onBulkUpload={() => setShowBulkUploadModal(true)} />}
        </main>
      </div>

      {/* Add Lot Modal */}
      <AddLotModal
        isOpen={showAddLotModal}
        onClose={() => setShowAddLotModal(false)}
        siteId={siteId}
        onSuccess={loadSiteData}
      />

      {/* Add Team Member Modal */}
      {showAddTeamModal && (
        <AddTeamModal
          siteId={siteId}
          onClose={() => setShowAddTeamModal(false)}
        />
      )}

      {/* Upload Document Modal */}
      {showUploadDocModal && (
        <UploadDocModal
          siteId={siteId}
          onClose={() => setShowUploadDocModal(false)}
        />
      )}

      {/* Bulk Document Upload Modal */}
      {showBulkUploadModal && (
        <BulkDocumentUpload
          siteId={siteId}
          houses={houses}
          onClose={() => setShowBulkUploadModal(false)}
          onComplete={loadSiteData}
        />
      )}

      {/* Issue Lot Modal */}
      {showIssueLotModal && selectedLotForIssue && (
        <IssueLotModal
          house={selectedLotForIssue}
          siteId={siteId}
          teamMembers={TEST_TEAM_MEMBERS}
          onClose={() => {
            setShowIssueLotModal(false)
            setSelectedLotForIssue(null)
          }}
          onSuccess={() => {
            setShowIssueLotModal(false)
            setSelectedLotForIssue(null)
            loadSiteData()
          }}
        />
      )}
    </div>
  )
}

// Log types for lots
const LOG_TYPES = {
  material: { label: 'Waiting Material', color: '#FF9500', icon: '📦' },
  inspection: { label: 'Waiting Inspection', color: '#AF52DE', icon: '🔍' },
  in_progress: { label: 'In Progress', color: '#007AFF', icon: '🔨' },
  on_hold: { label: 'On Hold', color: '#8E8E93', icon: '⏸️' },
  delayed: { label: 'Delayed', color: '#FF3B30', icon: '⚠️' },
  on_time: { label: 'On Time', color: '#34C759', icon: '✓' },
  weather: { label: 'Weather Delay', color: '#5AC8FA', icon: '🌧️' },
  subcontractor: { label: 'Waiting Sub', color: '#FF2D55', icon: '👷' },
}

// Simulated logs for demo (will be replaced with real data)
const getLogsForHouse = (houseId: string) => {
  // Placeholder - return random logs for demo
  const allTypes = Object.keys(LOG_TYPES) as (keyof typeof LOG_TYPES)[]
  const hash = houseId.charCodeAt(0) + houseId.charCodeAt(1)
  return [
    allTypes[hash % allTypes.length],
    allTypes[(hash + 3) % allTypes.length],
    allTypes[(hash + 5) % allTypes.length],
  ]
}

// Helper to calculate days until closing
const getDaysUntilClosing = (closingDate: string | null) => {
  if (!closingDate) return null
  return Math.ceil((new Date(closingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
}

const getClosingUrgencyColor = (days: number | null) => {
  if (days === null) return '#8E8E93'
  if (days < 0) return '#FF3B30' // Overdue
  if (days <= 7) return '#FF3B30' // Critical
  if (days <= 30) return '#FF9500' // Warning
  return '#34C759' // Good
}

// Lots View
function LotesView({
  houses,
  siteId,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onIssueLot,
}: {
  houses: House[]
  siteId: string
  sortBy: 'lot_number' | 'created_at' | 'progress' | 'closing_date' | 'priority'
  setSortBy: (value: 'lot_number' | 'created_at' | 'progress' | 'closing_date' | 'priority') => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (value: 'asc' | 'desc') => void
  onIssueLot: (house: House) => void
}) {
  const router = useRouter()
  const sortOptions = [
    { value: 'lot_number', label: 'Lot Number' },
    { value: 'closing_date', label: 'Closing Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'progress', label: 'Progress %' },
    { value: 'created_at', label: 'Date Added' },
  ]

  // Count issued vs locked
  const issuedCount = houses.filter(h => h.is_issued).length
  const lockedCount = houses.length - issuedCount

  const handleCardClick = (house: House) => {
    if (house.is_issued) {
      // Lot is issued - navigate to lot details
      router.push(`/site/${siteId}/lot/${house.id}`)
    } else {
      // Lot is locked - show issue modal
      onIssueLot(house)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex items-center gap-3 bg-white border border-[#D2D2D7] rounded-xl px-4 py-3">
        <span className="text-sm text-[#86868B]">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-1.5 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-sm text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] cursor-pointer"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
          className="px-3 py-1.5 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-sm text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] cursor-pointer"
        >
          <option value="asc">↑ Ascending</option>
          <option value="desc">↓ Descending</option>
        </select>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {lockedCount > 0 && (
            <span className="text-[#8E8E93] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {lockedCount} locked
            </span>
          )}
          {issuedCount > 0 && (
            <span className="text-[#34C759] flex items-center gap-1">
              <Unlock className="w-3.5 h-3.5" />
              {issuedCount} issued
            </span>
          )}
          <span className="text-[#86868B]">
            {houses.length} total
          </span>
        </div>
      </div>

      {/* Lots Grid - 3 per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {houses.map(house => {
          const isLocked = !house.is_issued
          const logs = getLogsForHouse(house.id)
          const daysUntilClosing = getDaysUntilClosing(house.closing_date)
          const urgencyColor = getClosingUrgencyColor(daysUntilClosing)

          return (
            <button
              key={house.id}
              onClick={() => handleCardClick(house)}
              className={`text-left rounded-xl p-5 transition-all group relative ${
                isLocked
                  ? 'bg-[#F5F5F7] border-2 border-dashed border-[#D2D2D7] hover:border-[#8E8E93]'
                  : 'bg-white border border-[#D2D2D7] hover:border-[#007AFF] hover:shadow-md'
              }`}
            >
              {/* Lock Badge for locked lots */}
              {isLocked && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#8E8E93] rounded-full flex items-center justify-center shadow-md">
                  <Lock className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Sold Badge */}
              {!isLocked && house.is_sold && (
                <div
                  className="absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white shadow-md"
                  style={{ backgroundColor: urgencyColor }}
                >
                  {daysUntilClosing !== null && daysUntilClosing > 0
                    ? `${daysUntilClosing}d`
                    : daysUntilClosing === 0
                    ? 'TODAY!'
                    : 'OVERDUE'
                  }
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-xl ${isLocked ? 'text-[#8E8E93]' : 'text-[#1D1D1F]'}`}>
                    Lot {house.lot_number}
                  </span>
                  {!isLocked && house.priority_score && house.priority_score > 70 && (
                    <span className="text-xs font-bold text-[#FF3B30]">P{house.priority_score}</span>
                  )}
                </div>
                {isLocked ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#8E8E93]/15 text-[#8E8E93]">
                    Locked
                  </span>
                ) : (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: LIGHT_STATUS_COLORS[house.status] + '15',
                      color: LIGHT_STATUS_COLORS[house.status]
                    }}
                  >
                    {STATUS_LABELS[house.status]}
                  </span>
                )}
              </div>

              {/* Locked state message */}
              {isLocked ? (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 bg-[#E5E5EA] rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-[#8E8E93]" />
                  </div>
                  <p className="text-[#8E8E93] text-sm font-medium">Not issued yet</p>
                  <p className="text-[#AEAEB2] text-xs mt-1">Click to assign worker & plans</p>
                </div>
              ) : (
                <>
                  {/* Buyer info if sold */}
                  {house.is_sold && house.buyer_name && (
                    <p className="text-[#34C759] text-sm mb-2 font-medium">🏠 {house.buyer_name}</p>
                  )}

                  {house.address && (
                    <p className="text-[#86868B] text-sm mb-3 truncate">{house.address}</p>
                  )}

                  {/* Closing Date Alert */}
                  {house.is_sold && house.closing_date && (
                    <div
                      className="mb-3 px-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: urgencyColor + '15', color: urgencyColor }}
                    >
                      <span className="font-semibold">Closing: </span>
                      {new Date(house.closing_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </div>
                  )}

                  {/* Worker assigned */}
                  {house.issued_to_worker_name && (
                    <p className="text-[#007AFF] text-sm mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {house.issued_to_worker_name}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-[#6E6E73] font-medium">{Math.round(house.progress_percentage)}% Complete</span>
                      <span className="text-[#86868B]">Phase {house.current_phase}/7</span>
                    </div>
                    <div className="h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#007AFF] rounded-full transition-all"
                        style={{ width: `${house.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Logs */}
                  <div className="border-t border-[#E5E5EA] pt-4 space-y-2">
                    <p className="text-xs font-semibold text-[#86868B] uppercase tracking-wider mb-2">Recent Logs</p>
                    {logs.map((logType, index) => {
                      const log = LOG_TYPES[logType]
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="text-base">{log.icon}</span>
                          <span
                            className="flex-1 truncate"
                            style={{ color: log.color }}
                          >
                            {log.label}
                          </span>
                          <span className="text-xs text-[#AEAEB2]">
                            {index === 0 ? 'Today' : index === 1 ? 'Yesterday' : '2d ago'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              <div className={`flex items-center justify-end mt-4 pt-3 border-t ${isLocked ? 'border-[#E5E5EA]' : 'border-[#E5E5EA]'}`}>
                {isLocked ? (
                  <>
                    <span className="text-sm text-[#8E8E93] font-medium group-hover:text-[#6E6E73]">Issue Lot</span>
                    <UserPlus className="w-4 h-4 text-[#8E8E93] ml-1 group-hover:text-[#6E6E73]" />
                  </>
                ) : (
                  <>
                    <span className="text-sm text-[#007AFF] font-medium group-hover:underline">View Details</span>
                    <ChevronRight className="w-4 h-4 text-[#007AFF] ml-1" />
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Empty */}
      {houses.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-[#86868B]" />
          </div>
          <p className="text-[#1D1D1F] font-medium">No lots found</p>
          <p className="text-[#86868B] text-sm mt-1">Add a lot to get started</p>
        </div>
      )}
    </div>
  )
}

// Settings Views
function SettingsTeamView({ onAddTeam }: { onAddTeam: () => void }) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onAddTeam}
          className="text-sm text-[#007AFF] hover:text-[#0056B3] hover:underline"
        >
          Add Team Member
        </button>
      </div>
      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
        <h3 className="font-semibold text-[#1D1D1F] mb-6">Project Team</h3>

        <div className="text-center py-8">
          <Users className="w-12 h-12 text-[#86868B] mx-auto mb-3" />
          <p className="text-[#6E6E73]">No members added yet</p>
          <p className="text-[#86868B] text-sm mt-1">Add supervisors and workers via QR code or token</p>
        </div>
      </div>
    </div>
  )
}

function SettingsDocumentsView({ onUploadDoc, onBulkUpload }: { onUploadDoc: () => void; onBulkUpload: () => void }) {
  const documentCategories = [
    {
      id: 'contracts',
      label: 'Contracts',
      description: 'Construction contracts, amendments, terms',
      icon: FileText,
      count: 0,
    },
    {
      id: 'plans',
      label: 'Plans & Blueprints',
      description: 'Architectural, structural, plumbing plans',
      icon: Layers,
      count: 0,
    },
    {
      id: 'licenses',
      label: 'Licenses & Permits',
      description: 'Building permits, environmental licenses',
      icon: Shield,
      count: 0,
    },
    {
      id: 'institutional',
      label: 'Institutional',
      description: 'Company documents, insurance, certificates',
      icon: Building2,
      count: 0,
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'Progress reports, inspections, assessments',
      icon: FileText,
      count: 0,
    },
  ]

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end gap-4">
        <button
          onClick={onBulkUpload}
          className="text-sm bg-[#007AFF] text-white px-4 py-2 rounded-lg hover:bg-[#0056B3] transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Bulk Upload
        </button>
        <button
          onClick={onUploadDoc}
          className="text-sm text-[#007AFF] hover:text-[#0056B3] hover:underline"
        >
          Upload Document
        </button>
      </div>
      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
        <h3 className="font-semibold text-[#1D1D1F] mb-2">Project Documents</h3>
        <p className="text-[#86868B] text-sm mb-6">
          Organize project documents by category. Click a category to view or add documents.
        </p>

        <div className="space-y-3">
          {documentCategories.map(category => (
            <button
              key={category.id}
              className="w-full bg-[#F5F5F7] hover:bg-[#E5E5EA] rounded-xl p-4 flex items-center gap-4 transition-colors text-left"
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <category.icon className="w-6 h-6 text-[#007AFF]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#1D1D1F] font-medium">{category.label}</span>
                  <span className="text-[#86868B] text-sm">{category.count} files</span>
                </div>
                <p className="text-[#86868B] text-sm mt-0.5">{category.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#AEAEB2]" />
            </button>
          ))}
        </div>
      </div>

      {/* Quick Upload */}
      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
        <h4 className="font-semibold text-[#1D1D1F] mb-4">Quick Upload</h4>
        <div className="border-2 border-dashed border-[#D2D2D7] rounded-xl p-8 text-center hover:border-[#007AFF] transition-colors cursor-pointer">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            className="hidden"
            id="doc-upload"
            multiple
          />
          <label htmlFor="doc-upload" className="cursor-pointer">
            <Upload className="w-10 h-10 mx-auto text-[#86868B] mb-3" />
            <p className="text-[#1D1D1F] font-medium">Drop files here or click to upload</p>
            <p className="text-[#86868B] text-sm mt-1">PDF, DOC, XLS, JPG, PNG (max 50MB)</p>
          </label>
        </div>
      </div>
    </div>
  )
}

// Add Team Member Modal
function AddTeamModal({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const [mode, setMode] = useState<'qr' | 'manual'>('qr')
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)

  // Generate a simple invite token (in production, this would be stored in DB)
  const inviteToken = `EAGLE-${siteId.slice(0, 8).toUpperCase()}`
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteToken}`

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = inviteLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Add Team Member</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#F5F5F7] rounded-lg transition-colors">
            <svg className="w-5 h-5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('qr')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                mode === 'qr' ? 'bg-[#007AFF] text-white' : 'bg-[#F5F5F7] text-[#6E6E73]'
              }`}
            >
              QR Code / Link
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                mode === 'manual' ? 'bg-[#007AFF] text-white' : 'bg-[#F5F5F7] text-[#6E6E73]'
              }`}
            >
              Manual Token
            </button>
          </div>

          {mode === 'qr' ? (
            <div className="text-center">
              {/* QR Code Placeholder */}
              <div className="w-48 h-48 bg-[#F5F5F7] rounded-xl mx-auto mb-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-white rounded-lg shadow-inner flex items-center justify-center border-2 border-[#1D1D1F]">
                    <span className="text-xs text-[#86868B]">QR Code</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#6E6E73] mb-3">
                Share this link with team members to join the project
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-sm text-[#6E6E73]"
                />
                <button
                  onClick={copyToken}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    copied ? 'bg-[#34C759] text-white' : 'bg-[#007AFF] text-white hover:bg-[#0056B3]'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#6E6E73] mb-4">
                Enter the token provided by the team member to add them manually.
              </p>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter member token..."
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] mb-4"
              />
              <button
                disabled={!token.trim()}
                className="w-full py-2.5 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056B3] transition-colors font-medium disabled:opacity-50"
              >
                Add Member
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#E5E5EA]">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-[#D2D2D7] text-[#1D1D1F] rounded-lg hover:bg-[#F5F5F7] transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Upload Document Modal
function UploadDocModal({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const [category, setCategory] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const categories = [
    { id: 'contracts', label: 'Contracts' },
    { id: 'plans', label: 'Plans & Blueprints' },
    { id: 'licenses', label: 'Licenses & Permits' },
    { id: 'institutional', label: 'Institutional' },
    { id: 'reports', label: 'Reports' },
    { id: 'rules', label: 'Rules & Policies' },
  ]

  const handleUpload = async () => {
    if (!file || !category) return
    setUploading(true)
    // TODO: Implement actual upload
    setTimeout(() => {
      setUploading(false)
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Upload Document</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#F5F5F7] rounded-lg transition-colors">
            <svg className="w-5 h-5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Category Select */}
          <div>
            <label className="block text-sm font-medium text-[#6E6E73] mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] bg-white"
            >
              <option value="">Select a category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-[#6E6E73] mb-1">File *</label>
            <div className="border-2 border-dashed border-[#D2D2D7] rounded-xl p-6 text-center hover:border-[#007AFF] transition-colors cursor-pointer">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="doc-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
              <label htmlFor="doc-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-[#86868B] mx-auto mb-2" />
                {file ? (
                  <p className="text-sm text-[#1D1D1F] font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-[#1D1D1F] font-medium">Click to upload</p>
                    <p className="text-xs text-[#86868B] mt-1">PDF, DOC, XLS, PNG, JPG</p>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#E5E5EA] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[#D2D2D7] text-[#1D1D1F] rounded-lg hover:bg-[#F5F5F7] transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !category || uploading}
            className="flex-1 px-4 py-2.5 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056B3] transition-colors font-medium disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Issue Lot Modal - with direct plan upload
function IssueLotModal({
  house,
  siteId,
  teamMembers,
  onClose,
  onSuccess
}: {
  house: House
  siteId: string
  teamMembers: TeamMember[]
  onClose: () => void
  onSuccess: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Pending files to upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Existing plans from database
  const [existingPlans, setExistingPlans] = useState<{ id: string; name: string; file_url: string }[]>([])
  const [checkingPlans, setCheckingPlans] = useState(true)

  // Filter only workers from team
  const workers = teamMembers.filter(m => m.role === 'worker')
  const selectedWorker = workers.find(w => w.id === selectedWorkerId)

  // Check if plans already exist for this lot (direct + linked from bulk upload)
  useEffect(() => {
    async function checkPlans() {
      setCheckingPlans(true)
      try {
        const plans: { id: string; name: string; file_url: string }[] = []
        const seenIds = new Set<string>()

        // 1. Check documents directly linked to house (legacy)
        const { data: directDocs } = await supabase
          .from('egl_documents')
          .select('id, name, file_url')
          .eq('house_id', house.id)
          .in('category', ['plan', 'plans', 'blueprint'])
          .is('deleted_at', null)
          .limit(20)

        if (directDocs) {
          for (const doc of directDocs) {
            if (!seenIds.has(doc.id)) {
              plans.push(doc)
              seenIds.add(doc.id)
            }
          }
        }

        // 2. Check documents linked via egl_document_links (bulk upload system)
        const { data: linkedDocs } = await supabase
          .from('v_house_documents')
          .select('document_id, file_name, file_url')
          .eq('house_id', house.id)
          .limit(20)

        if (linkedDocs) {
          for (const doc of linkedDocs) {
            if (!seenIds.has(doc.document_id)) {
              plans.push({
                id: doc.document_id,
                name: doc.file_name,
                file_url: doc.file_url
              })
              seenIds.add(doc.document_id)
            }
          }
        }

        setExistingPlans(plans)
      } catch (err) {
        console.error('[IssueLotModal] Error checking plans:', err)
      } finally {
        setCheckingPlans(false)
      }
    }
    checkPlans()
  }, [house.id])

  // Total plans = existing + pending
  const totalPlans = existingPlans.length + pendingFiles.length
  const hasPlans = totalPlans > 0
  const canIssue = selectedWorkerId && hasPlans

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter(f =>
      f.type === 'application/pdf' ||
      f.type.startsWith('image/') ||
      f.name.endsWith('.dwg') ||
      f.name.endsWith('.dxf')
    )
    setPendingFiles(prev => [...prev, ...newFiles])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleIssue() {
    if (!canIssue || !selectedWorker) return

    setIssuing(true)
    setError(null)

    try {
      const issuedAt = new Date().toISOString()
      const uploadedDocs: { id: string; name: string; file_url: string }[] = []

      // 1. Upload pending files
      for (const file of pendingFiles) {
        // Upload to storage
        const formData = new FormData()
        formData.append('file', file)
        formData.append('siteId', siteId)
        formData.append('houseId', house.id)
        formData.append('bucket', 'egl-media')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const uploadData = await uploadResponse.json()

        // Create document record
        const docResponse = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: siteId,
            house_id: house.id,
            name: file.name,
            file_url: uploadData.url,
            file_path: uploadData.path,
            file_type: file.type,
            file_size: file.size,
            category: 'plan',
          }),
        })

        if (docResponse.ok) {
          const docData = await docResponse.json()
          uploadedDocs.push({ id: docData.id, name: file.name, file_url: uploadData.url })
        }
      }

      // 2. Combine existing + newly uploaded
      const allPlans = [...existingPlans, ...uploadedDocs]

      // 3. Update the house to mark as issued
      // Note: issued_to_worker_id requires valid UUID from egl_site_workers
      // For now, we only store the worker name until real workers are integrated
      const { error: updateError } = await supabase
        .from('egl_houses')
        .update({
          is_issued: true,
          issued_at: issuedAt,
          issued_to_worker_name: selectedWorker.name,
          status: 'in_progress',
        })
        .eq('id', house.id)

      if (updateError) {
        console.error('Update error details:', JSON.stringify(updateError, null, 2))
        throw new Error(updateError.message || 'Failed to update house')
      }

      // 4. Create chat message for lot issuance (appears in ChatTimeline)
      const planNames = allPlans.length > 0 ? allPlans.map(d => d.name).join(', ') : 'No plans attached'

      // Build attachments array for plans
      const planAttachments = allPlans.map(doc => ({
        type: doc.file_url.endsWith('.pdf') ? 'application/pdf' : 'image',
        url: doc.file_url,
        name: doc.name,
      }))

      // Send issuance message with plans attached
      console.log('[Message] Sending issuance message...')
      try {
        const msgResponse = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: siteId,
            house_id: house.id,
            sender_type: 'system',
            sender_name: 'System',
            content: `🔓 **Lot ${house.lot_number} Issued**\n\nAssigned to: ${selectedWorker.name}${selectedWorker.trade ? ` (${selectedWorker.trade})` : ''}\nPlans: ${planNames}\n\nWork can now begin!`,
            attachments: planAttachments,
            is_ai_response: false,
            phase_at_creation: house.current_phase || 1,
          }),
        })

        if (msgResponse.ok) {
          const msgResult = await msgResponse.json()
          console.log('[Message] Created successfully:', msgResult.id)
        } else {
          const msgError = await msgResponse.json()
          console.error('[Message] API error:', msgResponse.status, msgError)
        }
      } catch (msgErr) {
        console.error('[Message] Fetch error:', msgErr)
      }

      // Also keep timeline entry for historical record
      const { error: timelineError } = await supabase.from('egl_timeline').insert({
        house_id: house.id,
        event_type: 'issue',
        title: `Lot ${house.lot_number} Issued to ${selectedWorker.name}`,
        description: `Building plans: ${planNames}. Work can now begin.`,
        source: 'system',
        metadata: {
          worker_name: selectedWorker.name,
          worker_trade: selectedWorker.trade,
          plans_count: allPlans.length,
          plan_ids: allPlans.map(d => d.id),
        },
        created_at: issuedAt,
      })

      if (timelineError) {
        console.error('Timeline error:', timelineError)
      }

      // 6. Create schedule entry via API (uses service_role to bypass RLS)
      const startDate = new Date()
      const expectedEndDate = new Date()
      expectedEndDate.setDate(expectedEndDate.getDate() + 42) // 6 weeks standard

      const scheduleData = {
        house_id: house.id,
        template_name: 'Standard Wood Frame',
        expected_start_date: startDate.toISOString().split('T')[0],
        expected_end_date: expectedEndDate.toISOString().split('T')[0],
        actual_start_date: startDate.toISOString().split('T')[0],
        status: 'in_progress',
        assigned_worker_name: selectedWorker.name,
      }

      console.log('[Schedule] Creating via API:', scheduleData)

      try {
        const scheduleResponse = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scheduleData),
        })

        if (scheduleResponse.ok) {
          const scheduleResult = await scheduleResponse.json()
          console.log('[Schedule] Created successfully:', scheduleResult)
        } else {
          const errorData = await scheduleResponse.json()
          console.error('[Schedule] API error:', errorData.error)
        }
      } catch (scheduleErr) {
        console.error('[Schedule] Fetch error:', scheduleErr)
      }

      // 7. Create calendar event (appears in Schedule tab calendar)
      console.log('[Event] Creating calendar event...')
      try {
        const eventResponse = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: siteId,
            house_id: house.id,
            event_type: 'other',
            title: `🔓 Lot ${house.lot_number} Issued`,
            description: `Assigned to ${selectedWorker.name}${selectedWorker.trade ? ` (${selectedWorker.trade})` : ''}. Plans: ${planNames}`,
            event_date: startDate.toISOString().split('T')[0],
            source: 'system',
          }),
        })

        if (eventResponse.ok) {
          const eventResult = await eventResponse.json()
          console.log('[Event] Created successfully:', eventResult.id)
        } else {
          const eventError = await eventResponse.json()
          console.error('[Event] API error:', eventError)
        }
      } catch (eventErr) {
        console.error('[Event] Fetch error:', eventErr)
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error issuing lot:', err)
      setError(err.message || 'Failed to issue lot')
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Issue Lot {house.lot_number}</h2>
            <p className="text-sm text-[#86868B]">Upload plans and assign worker</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#F5F5F7] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#86868B]" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Plans Upload Section */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
              Building Plans *
            </label>

            {/* Upload Area */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-[#007AFF] bg-[#007AFF]/5'
                  : 'border-[#D2D2D7] hover:border-[#007AFF] hover:bg-[#F5F5F7]'
              }`}
            >
              <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-[#007AFF]' : 'text-[#86868B]'}`} />
              <p className="text-sm text-[#1D1D1F] font-medium">
                {dragOver ? 'Drop files here' : 'Click or drag plans to upload'}
              </p>
              <p className="text-xs text-[#86868B] mt-1">PDF, PNG, JPG, DWG</p>
            </div>

            {/* Existing Plans */}
            {checkingPlans ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#86868B]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking for existing plans...</span>
              </div>
            ) : existingPlans.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-[#86868B] mb-2">Existing plans:</p>
                <div className="space-y-2">
                  {existingPlans.map(plan => (
                    <div key={plan.id} className="flex items-center gap-2 p-2 bg-[#34C759]/10 rounded-lg">
                      <FileText className="w-4 h-4 text-[#34C759]" />
                      <span className="text-sm text-[#1D1D1F] flex-1 truncate">{plan.name}</span>
                      <Check className="w-4 h-4 text-[#34C759]" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Files */}
            {pendingFiles.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-[#86868B] mb-2">Files to upload:</p>
                <div className="space-y-2">
                  {pendingFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-[#007AFF]/10 rounded-lg">
                      <FileText className="w-4 h-4 text-[#007AFF]" />
                      <span className="text-sm text-[#1D1D1F] flex-1 truncate">{file.name}</span>
                      <button
                        onClick={() => removePendingFile(index)}
                        className="p-1 hover:bg-[#FF3B30]/20 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-[#FF3B30]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plans Summary */}
            {!checkingPlans && (
              <div className={`mt-3 p-3 rounded-lg ${hasPlans ? 'bg-[#34C759]/10' : 'bg-[#FF9500]/10'}`}>
                <p className={`text-sm font-medium ${hasPlans ? 'text-[#34C759]' : 'text-[#FF9500]'}`}>
                  {hasPlans
                    ? `✓ ${totalPlans} plan${totalPlans !== 1 ? 's' : ''} ready`
                    : '⚠ Upload at least one plan to continue'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Worker Selection */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
              Assign Worker *
            </label>
            {workers.length === 0 ? (
              <div className="bg-[#F5F5F7] rounded-xl p-4 text-center">
                <Users className="w-8 h-8 text-[#86868B] mx-auto mb-2" />
                <p className="text-sm text-[#6E6E73]">No workers in team</p>
              </div>
            ) : (
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B] pointer-events-none" />
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:border-[#007AFF] bg-white appearance-none cursor-pointer"
                >
                  <option value="">Select a worker...</option>
                  {workers.map(worker => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name} {worker.trade ? `(${worker.trade})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B] pointer-events-none" />
              </div>
            )}
          </div>

          {/* Selected Worker Info */}
          {selectedWorker && (
            <div className="bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-semibold">
                {selectedWorker.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-[#1D1D1F]">{selectedWorker.name}</p>
                <p className="text-xs text-[#86868B]">{selectedWorker.trade || 'Worker'}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-lg">
              <p className="text-sm text-[#FF3B30]">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[#E5E5EA] flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={issuing}
            className="flex-1 px-4 py-3 border border-[#D2D2D7] text-[#1D1D1F] rounded-xl hover:bg-[#F5F5F7] transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleIssue}
            disabled={!canIssue || issuing}
            className="flex-1 px-4 py-3 bg-[#34C759] text-white rounded-xl hover:bg-[#2DB14D] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {issuing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Issuing...</span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                <span>Issue Lot</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Site Schedule View - Calendar for the entire jobsite
function SiteScheduleView({
  siteId,
  siteName,
  houses,
}: {
  siteId: string
  siteName: string
  houses: House[]
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch site-level events
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      try {
        const response = await fetch(`/api/events?siteId=${siteId}`)
        if (response.ok) {
          const data = await response.json()
          // Convert to CalendarEvent format
          const calendarEvents: CalendarEvent[] = data.map((e: any) => ({
            id: e.id,
            title: e.title,
            date: new Date(e.event_date),
            type: mapEventType(e.event_type),
            description: e.description,
            metadata: {
              house_id: e.house_id,
              source: e.source,
              impact_severity: e.impact_severity,
            },
          }))
          setEvents(calendarEvents)
        }
      } catch (error) {
        console.error('Error fetching site events:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [siteId])

  // Map database event_type to CalendarEvent type
  function mapEventType(dbType: string): CalendarEvent['type'] {
    if (dbType.startsWith('inspection')) return 'inspection'
    if (dbType.startsWith('material')) return 'delivery'
    if (dbType.startsWith('weather')) return 'weather'
    if (dbType === 'holiday') return 'holiday'
    return 'other'
  }

  // Get events for selected date
  const eventsForSelectedDate = selectedDate
    ? events.filter(e => {
        const eventDate = new Date(e.date)
        return (
          eventDate.getFullYear() === selectedDate.getFullYear() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getDate() === selectedDate.getDate()
        )
      })
    : []

  // Summary stats
  const totalEvents = events.length
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).length

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Site Schedule</h3>
          <p className="text-sm text-[#86868B]">
            {totalEvents} events • {upcomingEvents} upcoming
          </p>
        </div>
        <button
          className="px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0066CC] transition-colors text-sm font-medium flex items-center gap-2"
          onClick={() => {/* TODO: Add event modal */}}
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* Main content - Calendar + Event Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center h-96 bg-white rounded-xl border border-[#D2D2D7]">
              <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
            </div>
          ) : (
            <Calendar
              events={events}
              selectedDate={selectedDate || undefined}
              onDateSelect={(date) => setSelectedDate(date)}
              onEventClick={(event) => setSelectedEvent(event)}
              highlightToday={true}
              locale="en-CA"
            />
          )}
        </div>

        {/* Event Details Panel */}
        <div className="bg-white rounded-xl border border-[#D2D2D7] p-4">
          <h4 className="font-semibold text-[#1D1D1F] mb-4">
            {selectedDate
              ? selectedDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Select a date'}
          </h4>

          {selectedDate ? (
            eventsForSelectedDate.length > 0 ? (
              <div className="space-y-3">
                {eventsForSelectedDate.map(event => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEvent?.id === event.id
                        ? 'border-[#007AFF] bg-[#007AFF]/5'
                        : 'border-[#E5E5EA] hover:border-[#007AFF]/50'
                    }`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-3 h-3 rounded-full mt-1"
                        style={{ backgroundColor: getEventColor(event.type) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1D1D1F] text-sm truncate">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-[#86868B] mt-1 line-clamp-2">{event.description}</p>
                        )}
                        <span className="text-xs text-[#8E8E93] mt-1 block capitalize">{event.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDays className="w-12 h-12 text-[#D2D2D7] mx-auto mb-3" />
                <p className="text-sm text-[#86868B]">No events on this day</p>
                <button
                  className="mt-3 text-sm text-[#007AFF] hover:underline"
                  onClick={() => {/* TODO: Add event modal */}}
                >
                  + Add event
                </button>
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="w-12 h-12 text-[#D2D2D7] mx-auto mb-3" />
              <p className="text-sm text-[#86868B]">Click a date to view events</p>
            </div>
          )}

          {/* Lot quick links - show lots with events on selected date */}
          {selectedDate && eventsForSelectedDate.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
              <p className="text-xs font-semibold text-[#86868B] uppercase mb-2">Related Lots</p>
              <div className="space-y-1">
                {[...new Set(eventsForSelectedDate.map(e => e.metadata?.house_id).filter(Boolean))].map(houseId => {
                  const house = houses.find(h => h.id === houseId)
                  if (!house) return null
                  return (
                    <a
                      key={houseId}
                      href={`/site/${siteId}/lot/${houseId}`}
                      className="block text-sm text-[#007AFF] hover:underline"
                    >
                      Lot {house.lot_number}
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-[#86868B]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#007AFF]" />
          <span>Inspection</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#34C759]" />
          <span>Delivery</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF9500]" />
          <span>Weather</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#AF52DE]" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#8E8E93]" />
          <span>Other</span>
        </div>
      </div>
    </div>
  )
}

// Helper function for event colors
function getEventColor(type: CalendarEvent['type']): string {
  switch (type) {
    case 'inspection': return '#007AFF'
    case 'delivery': return '#34C759'
    case 'weather': return '#FF9500'
    case 'holiday': return '#AF52DE'
    default: return '#8E8E93'
  }
}
