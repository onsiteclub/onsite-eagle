'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Building2, Calendar, MapPin, Home,
  BarChart3, AlertTriangle, ChevronRight, FolderOpen
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Site, House } from '@onsite/shared'

export default function Overview() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [allHouses, setAllHouses] = useState<House[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

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

  // Calculate stats - sites / houses
  const stats = useMemo(() => {
    const totalSites = sites.length
    const totalHouses = allHouses.length

    // Group houses by site to count sites with specific statuses
    const sitesWithInProgress = new Set(allHouses.filter(h => h.status === 'in_progress').map(h => h.site_id)).size
    const housesInProgress = allHouses.filter(h => h.status === 'in_progress').length

    const sitesWithCompleted = new Set(allHouses.filter(h => h.status === 'completed').map(h => h.site_id)).size
    const housesCompleted = allHouses.filter(h => h.status === 'completed').length

    const sitesWithDelayed = new Set(allHouses.filter(h => h.status === 'delayed').map(h => h.site_id)).size
    const housesDelayed = allHouses.filter(h => h.status === 'delayed').length

    return {
      totalSites, totalHouses,
      sitesWithInProgress, housesInProgress,
      sitesWithCompleted, housesCompleted,
      sitesWithDelayed, housesDelayed
    }
  }, [sites, allHouses])

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

        {/* Menu Navigation - Always expanded, scrollable */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {/* Jobsites Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 py-2 text-[#6E6E73]">
              <FolderOpen className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Jobsites</span>
            </div>

            <div className="space-y-0.5">
              {/* List of Sites */}
              {filteredSites.map(site => (
                <button
                  key={site.id}
                  onClick={() => router.push(`/site/${site.id}`)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7] transition-colors"
                >
                  <Building2 className="w-4 h-4 flex-shrink-0 text-[#007AFF]" />
                  <span className="text-sm font-medium text-[#1D1D1F] truncate flex-1 text-left">{site.name}</span>
                  <span className="text-xs text-[#86868B] flex-shrink-0">
                    {site.completed_lots || 0}/{site.total_lots || 0}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#AEAEB2]" />
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Settings Card - Clickable */}
        <div className="p-3 border-t border-[#D2D2D7]">
          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] transition-colors"
          >
            <div className="w-10 h-10 bg-[#007AFF] rounded-full flex items-center justify-center text-white text-sm font-semibold">
              S
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#1D1D1F]">Settings</p>
              <p className="text-xs text-[#86868B]">Profile, Notifications & More</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#AEAEB2]" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#D2D2D7] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#1D1D1F]">Overview</h2>
              <p className="text-sm text-[#86868B]">
                {sites.length} site{sites.length !== 1 ? 's' : ''} registered
              </p>
            </div>
          </div>
        </header>

        {/* Stats Cards - Sites / Houses */}
        <div className="bg-white border-b border-[#D2D2D7] px-6 py-5">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#F5F5F7] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#86868B] font-medium">Total</p>
                  <p className="text-3xl font-semibold text-[#007AFF] mt-1">
                    {stats.totalSites}<span className="text-lg text-[#86868B]">/{stats.totalHouses}</span>
                  </p>
                  <p className="text-xs text-[#86868B] mt-0.5">sites / lots</p>
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
                  <p className="text-3xl font-semibold text-[#FF9500] mt-1">
                    {stats.sitesWithInProgress}<span className="text-lg text-[#86868B]">/{stats.housesInProgress}</span>
                  </p>
                  <p className="text-xs text-[#86868B] mt-0.5">sites / lots</p>
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
                  <p className="text-3xl font-semibold text-[#34C759] mt-1">
                    {stats.sitesWithCompleted}<span className="text-lg text-[#86868B]">/{stats.housesCompleted}</span>
                  </p>
                  <p className="text-xs text-[#86868B] mt-0.5">sites / lots</p>
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
                  <p className="text-3xl font-semibold text-[#FF3B30] mt-1">
                    {stats.sitesWithDelayed}<span className="text-lg text-[#86868B]">/{stats.housesDelayed}</span>
                  </p>
                  <p className="text-xs text-[#86868B] mt-0.5">sites / lots</p>
                </div>
                <div className="w-12 h-12 bg-[#FF3B30]/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-[#FF3B30]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <OverviewContent
            sites={filteredSites}
            loading={loading}
            onSiteClick={(site) => router.push(`/site/${site.id}`)}
          />
        </div>
      </main>
    </div>
  )
}

// Overview Content - Shows all sites as cards
function OverviewContent({
  sites,
  loading,
  onSiteClick
}: {
  sites: Site[]
  loading: boolean
  onSiteClick: (site: Site) => void
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

    </div>
  )
}
