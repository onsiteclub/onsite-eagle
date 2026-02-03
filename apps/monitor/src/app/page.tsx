'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Building2, Settings, Plus,
  ChevronRight, ChevronDown, Calendar, MapPin, Home,
  BarChart3, AlertTriangle, Map, FileText,
  Users, X, QrCode, Copy, Check, User, Bell, Info,
  FolderOpen
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Site, House } from '@onsite/shared'
import { QRCode } from '@onsite/ui/web'

type ViewType = 'overview' | 'profile' | 'notifications' | 'about'

export default function Overview() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [allHouses, setAllHouses] = useState<House[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<ViewType>('overview')
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['jobsites']))
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set())
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Generate a unique link for workers to connect
  const workerLink = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/connect/worker`
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: sitesData } = await supabase
        .from('egl_sites')
        .select('*')
        .order('name')

      if (sitesData) {
        setSites(sitesData)
      }

      const { data: housesData } = await supabase
        .from('egl_houses')
        .select('*')

      if (housesData) {
        setAllHouses(housesData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const total = allHouses.length
    const inProgress = allHouses.filter(h => h.status === 'in_progress').length
    const completed = allHouses.filter(h => h.status === 'completed').length
    const delayed = allHouses.filter(h => h.status === 'delayed').length
    return { total, inProgress, completed, delayed }
  }, [allHouses])

  // Smart search
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sites

    const query = searchQuery.toLowerCase().trim()
    const queryWords = query.split(/\s+/)

    return sites.filter(site => {
      const searchText = `${site.name} ${site.address} ${site.city}`.toLowerCase()
      return queryWords.every(word => searchText.includes(word))
    })
  }, [sites, searchQuery])

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => {
      const next = new Set(prev)
      if (next.has(menuId)) {
        next.delete(menuId)
      } else {
        next.add(menuId)
      }
      return next
    })
  }

  const toggleSite = (siteId: string) => {
    setExpandedSites(prev => {
      const next = new Set(prev)
      if (next.has(siteId)) {
        next.delete(siteId)
      } else {
        next.add(siteId)
      }
      return next
    })
  }

  // Get current view title
  const getViewTitle = () => {
    switch (activeView) {
      case 'overview': return 'Overview'
      case 'profile': return 'Profile'
      case 'notifications': return 'Notifications'
      case 'about': return 'About'
      default: return 'Overview'
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[#D2D2D7] flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-[#D2D2D7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#007AFF] rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg text-[#1D1D1F]">OnSite Eagle</h1>
              <p className="text-xs text-[#86868B]">Construction Monitor</p>
            </div>
          </div>
        </div>

        {/* Search in Sidebar */}
        <div className="p-4 border-b border-[#D2D2D7]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg pl-10 pr-3 py-2 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 p-3 overflow-auto">
          {/* Jobsites Section */}
          <div className="mb-2">
            <button
              onClick={() => toggleMenu('jobsites')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7] transition-colors"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Jobsites</span>
              </div>
              {expandedMenus.has('jobsites') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {expandedMenus.has('jobsites') && (
              <div className="ml-2 mt-1 space-y-0.5">
                {/* List of Sites */}
                {filteredSites.map(site => (
                  <div key={site.id}>
                    {/* Site Header */}
                    <button
                      onClick={() => toggleSite(site.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7] transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Building2 className="w-4 h-4 flex-shrink-0 text-[#007AFF]" />
                        <span className="text-sm font-medium text-[#1D1D1F] truncate">{site.name}</span>
                        <span className="text-xs text-[#86868B] flex-shrink-0">
                          {site.completed_lots || 0}/{site.total_lots || 0}
                        </span>
                      </div>
                      {expandedSites.has(site.id) ? (
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      )}
                    </button>

                    {/* Site Submenu */}
                    {expandedSites.has(site.id) && (
                      <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-[#E5E5EA] pl-2">
                        <button
                          onClick={() => router.push(`/site/${site.id}?tab=lots`)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors text-left"
                        >
                          <Home className="w-4 h-4" />
                          <span className="text-sm">Lots</span>
                        </button>
                        <button
                          onClick={() => router.push(`/site/${site.id}?tab=layout`)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors text-left"
                        >
                          <Map className="w-4 h-4" />
                          <span className="text-sm">Map</span>
                        </button>
                        <button
                          onClick={() => router.push(`/site/${site.id}?tab=documents`)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors text-left"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">Documents</span>
                        </button>
                        <button
                          onClick={() => router.push(`/site/${site.id}?tab=settings`)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors text-left"
                        >
                          <Settings className="w-4 h-4" />
                          <span className="text-sm">Settings</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add New Site */}
                <button
                  onClick={() => router.push('/site/new')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">New Jobsite</span>
                </button>
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="mb-2">
            <button
              onClick={() => toggleMenu('settings')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Settings</span>
              </div>
              {expandedMenus.has('settings') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {expandedMenus.has('settings') && (
              <div className="ml-2 mt-1 space-y-0.5">
                <button
                  onClick={() => setActiveView('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    activeView === 'profile'
                      ? 'bg-[#007AFF]/10 text-[#007AFF]'
                      : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium text-sm">Profile</span>
                </button>
                <button
                  onClick={() => setActiveView('notifications')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    activeView === 'notifications'
                      ? 'bg-[#007AFF]/10 text-[#007AFF]'
                      : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-medium text-sm">Notifications</span>
                </button>
                <button
                  onClick={() => setActiveView('about')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    activeView === 'about'
                      ? 'bg-[#007AFF]/10 text-[#007AFF]'
                      : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Info className="w-5 h-5" />
                  <span className="font-medium text-sm">About</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Link Workers Button */}
        <div className="p-3 border-t border-[#D2D2D7]">
          <button
            onClick={() => setShowLinkModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors"
          >
            <Users className="w-5 h-5" />
            <span className="font-medium text-sm">Link Workers</span>
          </button>
        </div>

        {/* User */}
        <div className="p-4 border-t border-[#D2D2D7]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center text-white text-sm font-semibold">
              C
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#1D1D1F]">Cris</p>
              <p className="text-xs text-[#86868B]">Supervisor</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#D2D2D7] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#1D1D1F]">{getViewTitle()}</h2>
              <p className="text-sm text-[#86868B]">
                {sites.length} site{sites.length !== 1 ? 's' : ''} registered
              </p>
            </div>
          </div>
        </header>

        {/* Stats Cards - Only show on overview */}
        {activeView === 'overview' && (
          <div className="bg-white border-b border-[#D2D2D7] px-6 py-5">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#F5F5F7] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#86868B] font-medium">Total Houses</p>
                    <p className="text-3xl font-semibold text-[#1D1D1F] mt-1">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
                    <Home className="w-6 h-6 text-[#007AFF]" />
                  </div>
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#86868B] font-medium">In Progress</p>
                    <p className="text-3xl font-semibold text-[#FF9500] mt-1">{stats.inProgress}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#FF9500]/10 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-[#FF9500]" />
                  </div>
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#86868B] font-medium">Completed</p>
                    <p className="text-3xl font-semibold text-[#34C759] mt-1">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#34C759]/10 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#34C759]" />
                  </div>
                </div>
              </div>
              <div className="bg-[#F5F5F7] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#86868B] font-medium">Delayed</p>
                    <p className="text-3xl font-semibold text-[#FF3B30] mt-1">{stats.delayed}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#FF3B30]/10 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-[#FF3B30]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeView === 'overview' && (
            <OverviewContent
              sites={filteredSites}
              loading={loading}
              onSiteClick={(site) => router.push(`/site/${site.id}`)}
              onAddSite={() => router.push('/site/new')}
            />
          )}
          {activeView === 'profile' && <ProfileView />}
          {activeView === 'notifications' && <NotificationsView />}
          {activeView === 'about' && <AboutView />}
        </div>
      </main>

      {/* Link Workers Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#1D1D1F]">Link Workers</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-[#6E6E73] text-sm mb-6">
              Workers can scan this QR code with their phone to connect and send updates to this dashboard.
            </p>

            {/* QR Code */}
            <div className="bg-[#F5F5F7] rounded-xl p-6 flex items-center justify-center mb-6">
              <QRCode value={workerLink} size={200} level="H" />
            </div>

            {/* Link */}
            <div className="bg-[#F5F5F7] rounded-lg p-3 flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-[#86868B] flex-shrink-0" />
              <span className="text-[#1D1D1F] text-sm truncate flex-1">{workerLink}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(workerLink)
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                }}
                className="text-[#007AFF] hover:text-[#0056B3] transition-colors flex-shrink-0"
              >
                {linkCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <p className="text-[#86868B] text-xs text-center">
              Each worker will receive a unique identifier when connecting.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Overview Content - Shows all sites as cards
function OverviewContent({
  sites,
  loading,
  onSiteClick,
  onAddSite
}: {
  sites: Site[]
  loading: boolean
  onSiteClick: (site: Site) => void
  onAddSite: () => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Site Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sites.map(site => (
          <button
            key={site.id}
            onClick={() => onSiteClick(site)}
            className="bg-white border border-[#D2D2D7] rounded-xl p-5 text-left hover:border-[#007AFF] hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-[#1D1D1F] text-lg group-hover:text-[#007AFF] transition-colors">
                {site.name}
              </h3>
              <span className="bg-[#007AFF] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {site.completed_lots || 0}/{site.total_lots || 0}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[#6E6E73] text-sm mb-1">
              <MapPin className="w-4 h-4" />
              <span>{site.address}</span>
            </div>
            <p className="text-[#86868B] text-sm mb-4">{site.city}</p>

            {/* Progress Bar */}
            <div className="h-2 bg-[#E5E5EA] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#007AFF] rounded-full transition-all"
                style={{
                  width: `${site.total_lots ? ((site.completed_lots || 0) / site.total_lots) * 100 : 0}%`
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#86868B]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {site.start_date
                  ? `Start: ${new Date(site.start_date).toLocaleDateString('en-CA')}`
                  : 'No date'}
              </span>
              <ChevronRight className="w-4 h-4 text-[#AEAEB2] group-hover:text-[#007AFF] transition-colors" />
            </div>
          </button>
        ))}
      </div>

      {/* Empty State */}
      {sites.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-[#86868B]" />
          </div>
          <p className="text-[#1D1D1F] text-lg font-medium">No sites found</p>
          <p className="text-[#86868B] text-sm mt-1">Add a new site to get started</p>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={onAddSite}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#007AFF] hover:bg-[#0056B3] rounded-full flex items-center justify-center shadow-lg transition-colors"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
    </div>
  )
}

// Profile View
function ProfileView() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#007AFF] rounded-full flex items-center justify-center text-white text-2xl font-semibold">
            C
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#1D1D1F]">Cris</h3>
            <p className="text-[#86868B]">Supervisor</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
            <span className="text-[#6E6E73]">Email</span>
            <span className="text-[#1D1D1F]">cris@onsite.com</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
            <span className="text-[#6E6E73]">Role</span>
            <span className="text-[#1D1D1F]">Supervisor</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-[#6E6E73]">Member since</span>
            <span className="text-[#1D1D1F]">January 2024</span>
          </div>
        </div>

        <button className="mt-6 w-full bg-[#007AFF] hover:bg-[#0056B3] text-white font-semibold py-3 px-6 rounded-lg transition-colors">
          Edit Profile
        </button>
      </div>
    </div>
  )
}

// Notifications View
function NotificationsView() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
        <h3 className="font-semibold text-[#1D1D1F] mb-4">Notification Settings</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
            <div>
              <p className="text-[#1D1D1F] font-medium">Push Notifications</p>
              <p className="text-[#86868B] text-sm">Receive alerts on your device</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#007AFF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[#E5E5EA]">
            <div>
              <p className="text-[#1D1D1F] font-medium">Email Notifications</p>
              <p className="text-[#86868B] text-sm">Receive daily summary by email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#007AFF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[#1D1D1F] font-medium">Delay Alerts</p>
              <p className="text-[#86868B] text-sm">Get notified when lots are delayed</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#007AFF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

// About View
function AboutView() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6 text-center">
        <div className="w-20 h-20 bg-[#007AFF] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-semibold text-[#1D1D1F]">OnSite Eagle</h3>
        <p className="text-[#86868B] mt-1">Construction Monitor</p>
        <p className="text-[#007AFF] mt-2">Version 1.0.0</p>
      </div>

      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
        <h4 className="font-semibold text-[#1D1D1F] mb-3">About</h4>
        <p className="text-[#6E6E73] text-sm leading-relaxed">
          OnSite Eagle is a complete construction monitoring platform designed to help supervisors
          track progress, manage lots, and coordinate with workers in real time. Built with
          AI photo validation and intuitive dashboards.
        </p>
      </div>

      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
        <h4 className="font-semibold text-[#1D1D1F] mb-3">Support</h4>
        <div className="space-y-2">
          <button className="w-full text-left py-2 text-[#007AFF] hover:underline">
            Documentation
          </button>
          <button className="w-full text-left py-2 text-[#007AFF] hover:underline">
            Contact Support
          </button>
          <button className="w-full text-left py-2 text-[#007AFF] hover:underline">
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  )
}
