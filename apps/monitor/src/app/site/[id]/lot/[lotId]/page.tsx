'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Search, Clock, ExternalLink, Calendar as CalendarIcon, X,
  Upload, File, Loader2, Sparkles, Users, Copy, Check, Package
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { House, FormFieldSuggestion, CalendarEvent, SiteWorker } from '@onsite/shared'
import { createCalendarEvent } from '@onsite/shared'
import { Calendar } from '@onsite/ui/web'
import ChatTimeline from '@/components/ChatTimeline'
import MaterialRequestsView from '@/components/MaterialRequestsView'
import { useAICopilot } from '@/hooks/useAICopilot'
import AISuggestionPanel from '@/components/AISuggestionPanel'

// Sidebar section types
type SidebarSection = 'timeline' | 'documents' | 'schedule' | 'materials' | 'team'

interface LotDocument {
  id: string
  house_id: string | null
  site_id?: string | null
  name: string
  file_url: string
  file_type: string
  file_size?: number
  category: string
  source: 'document' | 'timeline' | 'photo'
  created_at: string
  sender_name?: string
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed',
  on_hold: 'On Hold',
}

const LIGHT_STATUS_COLORS: Record<string, string> = {
  not_started: '#8E8E93',
  in_progress: '#FF9500',
  delayed: '#FF3B30',
  completed: '#34C759',
  on_hold: '#AF52DE',
}

export default function LotDetail() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteId = params.id as string
  const lotId = params.lotId as string

  const [house, setHouse] = useState<House | null>(null)
  const [documents, setDocuments] = useState<LotDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<SidebarSection>('timeline')
  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [siteWorkers, setSiteWorkers] = useState<SiteWorker[]>([])

  // Read tab from URL query params (e.g., ?tab=documents)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      const validTabs: SidebarSection[] = ['timeline', 'documents', 'schedule', 'materials', 'team']
      if (validTabs.includes(tab as SidebarSection)) {
        setActiveSection(tab as SidebarSection)
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (lotId) {
      loadLotData()
    }
  }, [lotId])

  async function loadLotData() {
    try {
      // Load house
      const { data: houseData } = await supabase
        .from('egl_houses')
        .select('*')
        .eq('id', lotId)
        .single()

      if (houseData) {
        setHouse(houseData)
      }

      // Load documents from API
      try {
        const docsResponse = await fetch(`/api/documents?houseId=${lotId}`)
        if (docsResponse.ok) {
          const docsData = await docsResponse.json()
          setDocuments(docsData || [])
        }
      } catch (docError) {
        console.error('Error loading documents:', docError)
      }

      // Load site workers
      try {
        const workersResponse = await fetch(`/api/site-workers?siteId=${siteId}`)
        if (workersResponse.ok) {
          const workersData = await workersResponse.json()
          setSiteWorkers(workersData || [])
        }
      } catch (workersError) {
        console.error('Error loading site workers:', workersError)
      }
    } catch (error) {
      console.error('Error loading lot:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]" />
      </div>
    )
  }

  if (!house) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center">
        <p className="text-[#FF3B30] text-lg mb-4">Lot not found</p>
        <button
          onClick={() => router.push(`/site/${siteId}`)}
          className="text-[#007AFF] hover:text-[#0056B3]"
        >
          Back to Jobsite
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[#D2D2D7] flex flex-col flex-shrink-0">
        {/* Back button and lot info */}
        <div className="p-4 border-b border-[#E5E5EA]">
          <button
            onClick={() => router.push(`/site/${siteId}`)}
            className="flex items-center gap-2 text-[#007AFF] hover:text-[#0056B3] transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Site</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[#1D1D1F]">Lot {house.lot_number}</h1>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{
                backgroundColor: LIGHT_STATUS_COLORS[house.status] + '15',
                color: LIGHT_STATUS_COLORS[house.status]
              }}
            >
              {STATUS_LABELS[house.status]}
            </span>
          </div>
          {house.address && (
            <p className="text-sm text-[#86868B] mt-1">{house.address}</p>
          )}
        </div>

        {/* Progress */}
        <div className="p-4 border-b border-[#E5E5EA]">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#6E6E73]">Progress</span>
            <span className="text-[#007AFF] font-medium">{house.progress_percentage}%</span>
          </div>
          <div className="h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#007AFF] rounded-full transition-all"
              style={{ width: `${house.progress_percentage}%` }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveSection('timeline')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeSection === 'timeline'
                    ? 'bg-[#AF52DE] text-white'
                    : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="font-medium">Timeline</span>
              </button>

              <button
                onClick={() => setActiveSection('documents')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeSection === 'documents'
                    ? 'bg-[#007AFF] text-white'
                    : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                }`}
              >
                <File className="w-5 h-5" />
                <span className="font-medium">Documents</span>
                {documents.length > 0 && (
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                    activeSection === 'documents' ? 'bg-white/20' : 'bg-[#E5E5EA]'
                  }`}>
                    {documents.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSection('schedule')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeSection === 'schedule'
                    ? 'bg-[#FF9500] text-white'
                    : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                }`}
              >
                <CalendarIcon className="w-5 h-5" />
                <span className="font-medium">Schedule</span>
                {house?.closing_date && (
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                    activeSection === 'schedule' ? 'bg-white/20' : 'bg-[#FF9500]/20 text-[#FF9500]'
                  }`}>
                    Sold
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSection('materials')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeSection === 'materials'
                    ? 'bg-[#FF3B30] text-white'
                    : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                }`}
              >
                <Package className="w-5 h-5" />
                <span className="font-medium">Materials</span>
              </button>

              <button
                onClick={() => setActiveSection('team')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeSection === 'team'
                    ? 'bg-[#34C759] text-white'
                    : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Team</span>
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* Add Team Member Modal */}
      {showAddTeamModal && (
        <AddTeamModal
          lotId={lotId}
          lotNumber={house.lot_number}
          onClose={() => setShowAddTeamModal(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeSection === 'timeline' && (
            <ChatTimeline
              siteId={siteId}
              houseId={lotId}
              houseLotNumber={house.lot_number}
              siteName={`Lot ${house.lot_number}`}
              currentUserName="Supervisor"
              currentPhase={house.current_phase}
              onLotUpdate={loadLotData}
            />
          )}
          {activeSection === 'documents' && (
            <DocumentsSection documents={documents} siteId={siteId} houseId={lotId} onRefresh={loadLotData} />
          )}
          {activeSection === 'schedule' && (
            <ScheduleSection house={house} siteId={siteId} onRefresh={loadLotData} />
          )}
          {activeSection === 'materials' && (
            <MaterialRequestsView
              siteId={siteId}
              houseId={lotId}
              houseLotNumber={house.lot_number}
            />
          )}
          {activeSection === 'team' && (
            <TeamSection lotId={lotId} lotNumber={house.lot_number} onAddTeam={() => setShowAddTeamModal(true)} />
          )}
        </main>
      </div>
    </div>
  )
}

// Documents Section
type SourceFilter = 'all' | 'photo' | 'document' | 'timeline'
type TypeFilter = 'all' | 'image' | 'pdf' | 'dwg' | 'doc' | 'other'
type CategoryFilter = 'all' | 'plans' | 'general'

function DocumentsSection({
  documents,
  siteId,
  houseId,
  onRefresh
}: {
  documents: LotDocument[]
  siteId: string
  houseId: string
  onRefresh: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  // Upload mode - regular or plans
  const [uploadAsPlans, setUploadAsPlans] = useState(false)

  // Document viewer modal state
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerDoc, setViewerDoc] = useState<LotDocument | null>(null)

  // Open document in modal
  const openDocumentViewer = (doc: LotDocument) => {
    setViewerDoc(doc)
    setViewerOpen(true)
  }

  // Close viewer modal
  const closeViewer = () => {
    setViewerOpen(false)
    setViewerDoc(null)
  }

  // Get file type icon color based on extension
  const getFileColor = (name: string) => {
    const ext = name.toLowerCase().split('.').pop()
    if (ext === 'pdf') return '#FF3B30'
    if (['doc', 'docx'].includes(ext || '')) return '#007AFF'
    if (['dwg', 'dxf'].includes(ext || '')) return '#FF9500'
    if (['png', 'jpg', 'jpeg'].includes(ext || '')) return '#34C759'
    return '#86868B'
  }

  // Check if file is previewable
  const isPreviewable = (doc: LotDocument) => {
    const ext = doc.name.toLowerCase().split('.').pop()
    const type = doc.file_type?.toLowerCase() || ''
    return type.startsWith('image/') || ext === 'pdf' || ['png', 'jpg', 'jpeg'].includes(ext || '')
  }

  // Get file type category for filtering
  const getFileTypeCategory = (doc: LotDocument): TypeFilter => {
    const ext = doc.name.toLowerCase().split('.').pop() || ''
    const type = doc.file_type?.toLowerCase() || ''

    if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image'
    if (ext === 'pdf' || type.includes('pdf')) return 'pdf'
    if (['dwg', 'dxf'].includes(ext)) return 'dwg'
    if (['doc', 'docx'].includes(ext) || type.includes('word')) return 'doc'
    return 'other'
  }

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter(doc => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = doc.name.toLowerCase().includes(query)
      const matchesSender = doc.sender_name?.toLowerCase().includes(query)
      if (!matchesName && !matchesSender) return false
    }

    // Source filter
    if (sourceFilter !== 'all' && doc.source !== sourceFilter) return false

    // Type filter
    if (typeFilter !== 'all' && getFileTypeCategory(doc) !== typeFilter) return false

    // Category filter (plans vs general)
    if (categoryFilter !== 'all') {
      const isPlans = doc.category === 'plan' || doc.category === 'plans'
      if (categoryFilter === 'plans' && !isPlans) return false
      if (categoryFilter === 'general' && isPlans) return false
    }

    return true
  })

  // Count plans documents
  const plansCount = documents.filter(d => d.category === 'plan' || d.category === 'plans').length

  const handleUpload = async (file: File) => {
    if (!file) return

    setUploading(true)
    try {
      // Step 1: Upload file to storage via API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('siteId', siteId)
      formData.append('houseId', houseId)
      formData.append('bucket', 'egl-media')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Upload failed')
      }

      const uploadData = await uploadResponse.json()

      // Step 2: Create document record in database
      const docResponse = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          house_id: houseId,
          name: file.name,
          file_url: uploadData.url,
          file_path: uploadData.path,
          file_type: file.type,
          file_size: file.size,
          category: uploadAsPlans ? 'plan' : undefined, // Mark as plan if uploading to Plans
        }),
      })

      if (!docResponse.ok) {
        const error = await docResponse.json()
        throw new Error(error.error || 'Failed to save document record')
      }

      onRefresh()
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload document')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  return (
    <div className="space-y-4">
      {/* Category Tabs - Plans vs General */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setCategoryFilter('all')
            setUploadAsPlans(false)
          }}
          className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-colors ${
            categoryFilter === 'all'
              ? 'bg-[#007AFF] text-white'
              : 'bg-white border border-[#D2D2D7] text-[#6E6E73] hover:border-[#007AFF]'
          }`}
        >
          All Documents
        </button>
        <button
          onClick={() => {
            setCategoryFilter('plans')
            setUploadAsPlans(true)
          }}
          className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
            categoryFilter === 'plans'
              ? 'bg-[#FF9500] text-white'
              : 'bg-white border border-[#D2D2D7] text-[#6E6E73] hover:border-[#FF9500]'
          }`}
        >
          <span>📐</span>
          Plans
          {plansCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              categoryFilter === 'plans' ? 'bg-white/20' : 'bg-[#FF9500]/10 text-[#FF9500]'
            }`}>
              {plansCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setCategoryFilter('general')
            setUploadAsPlans(false)
          }}
          className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-colors ${
            categoryFilter === 'general'
              ? 'bg-[#34C759] text-white'
              : 'bg-white border border-[#D2D2D7] text-[#6E6E73] hover:border-[#34C759]'
          }`}
        >
          General Files
        </button>
      </div>

      {/* Plans Info Banner */}
      {categoryFilter === 'plans' && (
        <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-xl p-3 flex items-start gap-3">
          <span className="text-lg">📐</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1D1D1F]">Official Plans</p>
            <p className="text-xs text-[#6E6E73]">
              Documents uploaded here are shared with team members linked in the Team tab.
              Team members can only access Plans, not other documents.
            </p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.dwg,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
      />
      <div
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
          dragOver
            ? uploadAsPlans
              ? 'border-[#FF9500] bg-[#FF9500]/5'
              : 'border-[#007AFF] bg-[#007AFF]/5'
            : uploadAsPlans
              ? 'border-[#FF9500]/50 hover:border-[#FF9500] bg-[#FF9500]/5'
              : 'border-[#D2D2D7] hover:border-[#007AFF] bg-white'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className={`w-5 h-5 animate-spin ${uploadAsPlans ? 'text-[#FF9500]' : 'text-[#007AFF]'}`} />
            <span className={`font-medium ${uploadAsPlans ? 'text-[#FF9500]' : 'text-[#007AFF]'}`}>
              Uploading {uploadAsPlans ? 'to Plans...' : '...'}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-2">
            <Upload className={`w-5 h-5 ${uploadAsPlans ? 'text-[#FF9500]' : 'text-[#86868B]'}`} />
            <span className={uploadAsPlans ? 'text-[#FF9500]' : 'text-[#6E6E73]'}>
              {dragOver
                ? `Drop file here${uploadAsPlans ? ' (Plans)' : ''}`
                : uploadAsPlans
                  ? 'Drop plans or click to upload'
                  : 'Drop files or click to upload'}
            </span>
            <span className="text-xs text-[#86868B]">PDF, DWG, PNG, JPG</span>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-[#D2D2D7] rounded-xl p-4">
        {/* Search Box */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
          <input
            type="text"
            placeholder="Search files by name..."
            className="w-full bg-[#F5F5F7] border border-transparent rounded-lg pl-10 pr-10 py-2 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:bg-white transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4">
          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#86868B] font-medium uppercase">Source:</span>
            <div className="flex gap-1">
              {[
                { value: 'all', label: 'All', color: '' },
                { value: 'photo', label: 'Photos', color: '#34C759' },
                { value: 'document', label: 'Documents', color: '#007AFF' },
                { value: 'timeline', label: 'Timeline', color: '#FF9500' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSourceFilter(opt.value as SourceFilter)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    sourceFilter === opt.value
                      ? opt.value === 'all'
                        ? 'bg-[#1D1D1F] text-white'
                        : 'text-white'
                      : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#E5E5EA]'
                  }`}
                  style={
                    sourceFilter === opt.value && opt.value !== 'all'
                      ? { backgroundColor: opt.color }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#86868B] font-medium uppercase">Type:</span>
            <div className="flex gap-1">
              {[
                { value: 'all', label: 'All', color: '' },
                { value: 'image', label: 'Images', color: '#34C759' },
                { value: 'pdf', label: 'PDF', color: '#FF3B30' },
                { value: 'dwg', label: 'CAD', color: '#FF9500' },
                { value: 'doc', label: 'Word', color: '#007AFF' },
                { value: 'other', label: 'Other', color: '#8E8E93' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTypeFilter(opt.value as TypeFilter)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    typeFilter === opt.value
                      ? opt.value === 'all'
                        ? 'bg-[#1D1D1F] text-white'
                        : 'text-white'
                      : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#E5E5EA]'
                  }`}
                  style={
                    typeFilter === opt.value && opt.value !== 'all'
                      ? { backgroundColor: opt.color }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(searchQuery || sourceFilter !== 'all' || typeFilter !== 'all') && (
          <div className="mt-3 pt-3 border-t border-[#E5E5EA] flex items-center justify-between">
            <span className="text-xs text-[#86868B]">
              Showing {filteredDocuments.length} of {documents.length} files
              {categoryFilter === 'plans' && ' (Plans only)'}
              {categoryFilter === 'general' && ' (General only)'}
            </span>
            <button
              onClick={() => {
                setSearchQuery('')
                setSourceFilter('all')
                setTypeFilter('all')
              }}
              className="text-xs text-[#007AFF] hover:underline"
            >
              Clear search filters
            </button>
          </div>
        )}
      </div>

      {/* File Count Summary */}
      {documents.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-[#86868B]">
          <span>{documents.length} file{documents.length !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span className="text-[#FF9500] font-medium">📐 {plansCount} plans</span>
          <span>•</span>
          <span>{documents.filter(d => d.source === 'photo').length} photos</span>
          <span>•</span>
          <span>{documents.filter(d => d.source === 'document').length - plansCount} other docs</span>
        </div>
      )}

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            {categoryFilter === 'plans' ? (
              <span className="text-3xl">📐</span>
            ) : (
              <File className="w-8 h-8 text-[#86868B]" />
            )}
          </div>
          <p className="text-[#1D1D1F] font-medium">
            {categoryFilter === 'plans' && plansCount === 0
              ? 'No plans uploaded yet'
              : documents.length === 0
                ? 'No files yet'
                : 'No files match your filters'}
          </p>
          <p className="text-[#86868B] text-sm mt-2">
            {categoryFilter === 'plans' && plansCount === 0
              ? 'Upload floor plans, blueprints, and other official drawings'
              : documents.length === 0
                ? 'Upload documents or send photos in the timeline'
                : 'Try adjusting your search or filter criteria'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#D2D2D7] rounded-xl divide-y divide-[#E5E5EA]">
          {filteredDocuments.map((doc) => {
            const fileColor = getFileColor(doc.name)
            const sourceColors: Record<string, { bg: string; text: string; label: string }> = {
              photo: { bg: '#34C75915', text: '#34C759', label: 'Photo' },
              document: { bg: '#007AFF15', text: '#007AFF', label: 'Document' },
              timeline: { bg: '#FF950015', text: '#FF9500', label: 'Timeline' },
            }
            const sourceStyle = sourceColors[doc.source] || sourceColors.document
            const isPlan = doc.category === 'plan' || doc.category === 'plans'

            return (
              <button
                key={doc.id}
                onClick={() => openDocumentViewer(doc)}
                className={`flex items-center gap-4 p-4 hover:bg-[#F5F5F7] transition-colors w-full text-left ${
                  isPlan ? 'bg-[#FF9500]/5' : ''
                }`}
              >
                {/* Thumbnail or Icon */}
                {doc.source === 'photo' || doc.file_type?.startsWith('image') ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F5F5F7] flex-shrink-0">
                    <img
                      src={doc.file_url}
                      alt={doc.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isPlan ? 'ring-2 ring-[#FF9500]' : ''
                    }`}
                    style={{ backgroundColor: isPlan ? '#FF950015' : `${fileColor}15` }}
                  >
                    {isPlan ? (
                      <span className="text-lg">📐</span>
                    ) : (
                      <File className="w-6 h-6" style={{ color: fileColor }} />
                    )}
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#1D1D1F] truncate">{doc.name}</p>
                    {isPlan && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF9500] text-white flex-shrink-0">
                        PLAN
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* Source Badge */}
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: sourceStyle.bg, color: sourceStyle.text }}
                    >
                      {sourceStyle.label}
                    </span>
                    {/* Date */}
                    <span className="text-xs text-[#86868B]">
                      {new Date(doc.created_at).toLocaleDateString('en-CA')}
                    </span>
                    {/* Sender (for timeline files) */}
                    {doc.sender_name && (
                      <>
                        <span className="text-xs text-[#86868B]">•</span>
                        <span className="text-xs text-[#86868B]">{doc.sender_name}</span>
                      </>
                    )}
                  </div>
                </div>

                <ExternalLink className="w-5 h-5 text-[#86868B] flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewerOpen && viewerDoc && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={closeViewer}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeViewer}
              className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* File name */}
            <div className="absolute -top-12 left-0 text-white/80 text-sm truncate max-w-[70%]">
              {viewerDoc.name}
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              {viewerDoc.file_type?.startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(viewerDoc.name.toLowerCase().split('.').pop() || '') ? (
                <img
                  src={viewerDoc.file_url}
                  alt={viewerDoc.name}
                  className="max-w-full max-h-[80vh] object-contain mx-auto"
                />
              ) : viewerDoc.name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={viewerDoc.file_url}
                  className="w-full h-[80vh]"
                  title={viewerDoc.name}
                />
              ) : (
                <div className="p-8 text-center">
                  <File className="w-16 h-16 text-[#86868B] mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#1D1D1F] mb-2">
                    {viewerDoc.name}
                  </p>
                  <p className="text-sm text-[#86868B] mb-4">
                    Preview not available for this file type
                  </p>
                  <a
                    href={viewerDoc.file_url}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056B3] transition-colors"
                  >
                    <File className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>

            {/* Download/Open buttons */}
            {isPreviewable(viewerDoc) && (
              <div className="absolute -bottom-12 right-0 flex gap-2">
                <a
                  href={viewerDoc.file_url}
                  download
                  className="text-white/80 hover:text-white text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <File className="w-4 h-4" />
                  Download
                </a>
                <a
                  href={viewerDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Open in new tab ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Schedule Section
// External event type from database
interface ExternalEvent {
  id: string
  site_id: string | null
  house_id: string | null
  event_type: string
  title: string
  description: string | null
  event_date: string
  source: string | null
  created_at: string
}

function ScheduleSection({
  house,
  siteId,
  onRefresh
}: {
  house: House
  siteId: string
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formData, setFormData] = useState({
    priority_score: house.priority_score || 50,
    target_date: house.target_date || '',
    closing_date: house.closing_date || '',
    buyer_name: house.buyer_name || '',
    buyer_contact: house.buyer_contact || '',
    schedule_notes: house.schedule_notes || '',
    is_sold: house.is_sold || false,
  })

  // Fetch external events (inspections, deliveries, etc) from AI and manual entries
  useEffect(() => {
    async function fetchExternalEvents() {
      try {
        const response = await fetch(`/api/events?houseId=${house.id}`)
        if (response.ok) {
          const data = await response.json()
          setExternalEvents(data || [])
        }
      } catch (error) {
        console.error('Error fetching external events:', error)
      }
    }
    fetchExternalEvents()
  }, [house.id])

  // AI Copilot for form assist
  const copilot = useAICopilot({
    siteId,
    houseId: house.id,
    onLotUpdated: () => onRefresh(),
  })

  // Handle AI form field suggestions
  const handleAIFormFields = (fields: FormFieldSuggestion) => {
    setFormData(prev => ({
      ...prev,
      ...(fields.priority_score !== undefined && { priority_score: Number(fields.priority_score) }),
      ...(fields.target_date && { target_date: String(fields.target_date) }),
      ...(fields.closing_date && { closing_date: String(fields.closing_date) }),
      ...(fields.buyer_name && { buyer_name: String(fields.buyer_name) }),
      ...(fields.buyer_contact && { buyer_contact: String(fields.buyer_contact) }),
      ...(fields.schedule_notes && { schedule_notes: String(fields.schedule_notes) }),
      ...(fields.is_sold !== undefined && { is_sold: Boolean(fields.is_sold) }),
    }))
    setEditing(true)
  }

  // Trigger AI assist for schedule form
  const handleAIAssist = () => {
    const content = JSON.stringify({
      formType: 'schedule',
      existingData: formData,
    })
    copilot.analyze(content, 'form_assist')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('egl_houses')
        .update({
          priority_score: formData.priority_score,
          target_date: formData.target_date || null,
          closing_date: formData.closing_date || null,
          buyer_name: formData.buyer_name || null,
          buyer_contact: formData.buyer_contact || null,
          schedule_notes: formData.schedule_notes || null,
          is_sold: formData.is_sold,
        })
        .eq('id', house.id)

      if (error) throw error

      setEditing(false)
      onRefresh()
    } catch (error) {
      console.error('Error saving schedule:', error)
      alert('Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  // Calculate days until closing
  const daysUntilClosing = formData.closing_date
    ? Math.ceil((new Date(formData.closing_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Determine urgency color
  const getUrgencyColor = () => {
    if (!daysUntilClosing) return '#8E8E93'
    if (daysUntilClosing < 0) return '#FF3B30' // Overdue
    if (daysUntilClosing <= 7) return '#FF3B30' // Critical
    if (daysUntilClosing <= 30) return '#FF9500' // Warning
    return '#34C759' // Good
  }

  // Build calendar events from schedule data
  const calendarEvents: CalendarEvent[] = []

  if (formData.target_date) {
    calendarEvents.push(
      createCalendarEvent({
        id: `target-${house.id}`,
        title: 'Target Completion',
        date: formData.target_date,
        type: 'target',
        description: `Internal target date for Lot ${house.lot_number}`,
      })
    )
  }

  if (formData.closing_date && formData.is_sold) {
    calendarEvents.push(
      createCalendarEvent({
        id: `closing-${house.id}`,
        title: `Closing - ${formData.buyer_name || 'Buyer'}`,
        date: formData.closing_date,
        type: 'deadline',
        description: formData.buyer_name
          ? `Closing with ${formData.buyer_name}`
          : 'Lot closing date',
      })
    )
  }

  // Add external events (inspections, deliveries, etc) from AI and manual entries
  for (const event of externalEvents) {
    // Map event_type to calendar type
    const eventTypeToCalendarType: Record<string, 'inspection' | 'delivery' | 'milestone' | 'deadline' | 'target' | 'work' | 'meeting' | 'custom'> = {
      'inspection_scheduled': 'inspection',
      'inspection_passed': 'inspection',
      'inspection_failed': 'inspection',
      'material_delivered': 'delivery',
      'material_delay': 'delivery',
      'other': 'work',
    }
    const calendarType = eventTypeToCalendarType[event.event_type] || 'work'

    calendarEvents.push(
      createCalendarEvent({
        id: event.id,
        title: event.title,
        date: event.event_date,
        type: calendarType,
        description: event.description || `${event.event_type.replace(/_/g, ' ')}`,
      })
    )
  }

  // Handle calendar event click
  const handleEventClick = (event: CalendarEvent) => {
    // Scroll to the form and highlight the relevant field
    setEditing(true)
  }

  return (
    <div className="space-y-6">
      {/* AI Suggestion Panel */}
      {(copilot.suggestions || copilot.loading || copilot.error) && (
        <AISuggestionPanel
          suggestions={copilot.suggestions}
          confidence={copilot.confidence}
          aiNotes={copilot.aiNotes}
          loading={copilot.loading}
          error={copilot.error}
          onApplySuggestion={copilot.applySuggestion}
          onApplyAll={copilot.applyAll}
          onDismiss={copilot.dismiss}
          onFormFieldsApply={handleAIFormFields}
        />
      )}

      {/* Calendar + Day Details */}
      <div className="flex gap-6">
        {/* Calendar */}
        <div className="flex-1 max-w-2xl">
          <Calendar
            events={calendarEvents}
            selectedDate={selectedDate || undefined}
            onEventClick={handleEventClick}
            onDateSelect={(date) => {
              setSelectedDate(date)
            }}
            highlightToday
            locale="en-CA"
          />
        </div>

        {/* Day Details Panel */}
        {selectedDate && (
          <div className="w-80 bg-white border border-[#D2D2D7] rounded-xl p-4 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-[#1D1D1F]">
                {selectedDate.toLocaleDateString('en-CA', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </h4>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Events for this day */}
            {(() => {
              const dateStr = selectedDate.toISOString().split('T')[0]
              const dayEvents = calendarEvents.filter(e => e.date === dateStr)

              if (dayEvents.length === 0) {
                return (
                  <div className="text-center py-6 text-[#86868B]">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No events scheduled</p>
                  </div>
                )
              }

              return (
                <div className="space-y-3">
                  {dayEvents.map((event) => {
                    // Find the external event for more details
                    const externalEvent = externalEvents.find(e => e.id === event.id)

                    // Color based on type
                    const typeColors: Record<string, { bg: string; border: string; text: string }> = {
                      inspection: { bg: '#E3F2FD', border: '#1976D2', text: '#1565C0' },
                      delivery: { bg: '#FFF3E0', border: '#F57C00', text: '#E65100' },
                      deadline: { bg: '#FFEBEE', border: '#D32F2F', text: '#C62828' },
                      target: { bg: '#E8F5E9', border: '#388E3C', text: '#2E7D32' },
                      milestone: { bg: '#F3E5F5', border: '#7B1FA2', text: '#6A1B9A' },
                      task: { bg: '#ECEFF1', border: '#546E7A', text: '#37474F' },
                    }
                    const colors = typeColors[event.type] || typeColors.task

                    return (
                      <div
                        key={event.id}
                        className="rounded-lg p-3 border-l-4"
                        style={{
                          backgroundColor: colors.bg,
                          borderLeftColor: colors.border
                        }}
                      >
                        {/* Event Type Badge */}
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: colors.border, color: 'white' }}
                          >
                            {event.type}
                          </span>
                          {externalEvent?.source && (
                            <span className="text-[10px] text-[#86868B]">
                              via {externalEvent.source.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h5
                          className="font-semibold text-sm"
                          style={{ color: colors.text }}
                        >
                          {event.title}
                        </h5>

                        {/* Description */}
                        {event.description && (
                          <p className="text-xs text-[#6E6E73] mt-1">
                            {event.description}
                          </p>
                        )}

                        {/* Lot Reference */}
                        <div className="mt-2 pt-2 border-t border-current/10 text-[10px] text-[#86868B]">
                          <span className="font-medium">Lot {house.lot_number}</span>
                          {externalEvent?.event_type && (
                            <span className="ml-2">• {externalEvent.event_type.replace(/_/g, ' ')}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Status Card */}
      <div className="bg-white border border-[#D2D2D7] rounded-xl p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-[#1D1D1F] text-lg">Schedule & Closing</h3>
          <div className="flex items-center gap-3">
            {!editing && !copilot.loading && (
              <button
                onClick={handleAIAssist}
                className="flex items-center gap-1.5 text-[#667EEA] text-sm font-medium hover:text-[#764BA2] transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                AI Assist
              </button>
            )}
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-[#007AFF] text-sm font-medium hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {formData.is_sold && formData.closing_date && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ backgroundColor: getUrgencyColor() + '15' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: getUrgencyColor() }}
              >
                {daysUntilClosing && daysUntilClosing > 0 ? daysUntilClosing : '!'}
              </div>
              <div>
                <p className="font-semibold text-[#1D1D1F]">
                  {daysUntilClosing && daysUntilClosing > 0
                    ? `${daysUntilClosing} days until closing`
                    : daysUntilClosing === 0
                    ? 'Closing is TODAY!'
                    : `${Math.abs(daysUntilClosing || 0)} days OVERDUE`
                  }
                </p>
                <p className="text-sm text-[#6E6E73]">
                  Closing: {new Date(formData.closing_date).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {editing ? (
          <div className="space-y-4">
            {/* Is Sold Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#F5F5F7] rounded-lg">
              <span className="font-medium text-[#1D1D1F]">Lot is Sold</span>
              <button
                onClick={() => setFormData({ ...formData, is_sold: !formData.is_sold })}
                className={`w-12 h-7 rounded-full transition-colors ${
                  formData.is_sold ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formData.is_sold ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Priority Score */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                Priority Score (1-100)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.priority_score}
                  onChange={(e) => setFormData({ ...formData, priority_score: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="w-12 text-center font-semibold text-[#007AFF]">
                  {formData.priority_score}
                </span>
              </div>
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                Target Completion Date (internal)
              </label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            {/* Closing Date */}
            {formData.is_sold && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                    Closing Date
                  </label>
                  <input
                    type="date"
                    value={formData.closing_date}
                    onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#007AFF]"
                  />
                </div>

                {/* Buyer Name */}
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                    Buyer Name
                  </label>
                  <input
                    type="text"
                    value={formData.buyer_name}
                    onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                    placeholder="e.g., John Smith"
                    className="w-full px-4 py-2.5 border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#007AFF]"
                  />
                </div>

                {/* Buyer Contact */}
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                    Buyer Contact
                  </label>
                  <input
                    type="text"
                    value={formData.buyer_contact}
                    onChange={(e) => setFormData({ ...formData, buyer_contact: e.target.value })}
                    placeholder="e.g., 613-555-1234 or email@example.com"
                    className="w-full px-4 py-2.5 border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </>
            )}

            {/* Schedule Notes */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                Schedule Notes
              </label>
              <textarea
                value={formData.schedule_notes}
                onChange={(e) => setFormData({ ...formData, schedule_notes: e.target.value })}
                placeholder="Any notes about timing, dependencies, etc."
                className="w-full h-24 px-4 py-3 border border-[#D2D2D7] rounded-lg resize-none focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            {/* Save/Cancel */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 px-4 py-2.5 border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056B3] transition-colors font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Display mode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#86868B] uppercase tracking-wider mb-1">Priority</p>
                <p className="text-2xl font-bold text-[#007AFF]">{formData.priority_score}</p>
              </div>
              <div>
                <p className="text-xs text-[#86868B] uppercase tracking-wider mb-1">Status</p>
                <p className={`text-lg font-semibold ${formData.is_sold ? 'text-[#34C759]' : 'text-[#8E8E93]'}`}>
                  {formData.is_sold ? '✓ Sold' : 'Not Sold'}
                </p>
              </div>
            </div>

            {formData.target_date && (
              <div>
                <p className="text-xs text-[#86868B] uppercase tracking-wider mb-1">Target Date</p>
                <p className="text-[#1D1D1F]">
                  {new Date(formData.target_date).toLocaleDateString('en-CA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}

            {formData.is_sold && (
              <>
                {formData.closing_date && (
                  <div>
                    <p className="text-xs text-[#86868B] uppercase tracking-wider mb-1">Closing Date</p>
                    <p className="text-[#1D1D1F]">
                      {new Date(formData.closing_date).toLocaleDateString('en-CA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                {formData.buyer_name && (
                  <div>
                    <p className="text-xs text-[#86868B] uppercase tracking-wider mb-1">Buyer</p>
                    <p className="text-[#1D1D1F]">{formData.buyer_name}</p>
                    {formData.buyer_contact && (
                      <p className="text-sm text-[#6E6E73]">{formData.buyer_contact}</p>
                    )}
                  </div>
                )}
              </>
            )}

            {formData.schedule_notes && (
              <div>
                <p className="text-xs text-[#86868B] uppercase tracking-wider mb-1">Notes</p>
                <p className="text-[#1D1D1F] text-sm bg-[#F5F5F7] rounded-lg p-3">
                  {formData.schedule_notes}
                </p>
              </div>
            )}

            {!formData.target_date && !formData.is_sold && !formData.schedule_notes && (
              <p className="text-[#86868B] text-sm italic">
                No schedule information set. Click Edit to add closing date and buyer info.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Team Section - Workers assigned to this lot
function TeamSection({
  lotId,
  lotNumber,
  onAddTeam
}: {
  lotId: string
  lotNumber: string
  onAddTeam: () => void
}) {
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
        <h3 className="font-semibold text-[#1D1D1F] mb-2">Lot {lotNumber} Team</h3>
        <p className="text-sm text-[#86868B] mb-6">
          Workers and supervisors assigned to this lot. They can only access this lot's data.
        </p>

        <div className="text-center py-8">
          <Users className="w-12 h-12 text-[#86868B] mx-auto mb-3" />
          <p className="text-[#6E6E73]">No team members yet</p>
          <p className="text-[#86868B] text-sm mt-1">
            Add workers via QR code or invite link
          </p>
        </div>
      </div>

      {/* Access Info */}
      <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-xl p-4">
        <p className="text-sm text-[#1565C0]">
          <strong>Note:</strong> Team members added here will only have access to Lot {lotNumber}.
          They cannot see other lots in this jobsite.
        </p>
      </div>
    </div>
  )
}

// Add Team Member Modal
function AddTeamModal({
  lotId,
  lotNumber,
  onClose
}: {
  lotId: string
  lotNumber: string
  onClose: () => void
}) {
  const [mode, setMode] = useState<'qr' | 'manual'>('qr')
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)

  // Generate invite token for this specific lot
  const inviteToken = `LOT-${lotId.slice(0, 8).toUpperCase()}`
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteToken}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
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
          <div>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Add Team Member</h2>
            <p className="text-xs text-[#86868B]">Lot {lotNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#F5F5F7] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#86868B]" />
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
                Share this link to grant access to <strong>Lot {lotNumber}</strong> only
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-sm text-[#6E6E73]"
                />
                <button
                  onClick={copyLink}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    copied ? 'bg-[#34C759] text-white' : 'bg-[#007AFF] text-white hover:bg-[#0056B3]'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#6E6E73] mb-4">
                Enter the token provided by the worker to add them to this lot.
              </p>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter worker token..."
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] mb-4"
              />
              <button
                disabled={!token.trim()}
                className="w-full py-2.5 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056B3] transition-colors font-medium disabled:opacity-50"
              >
                Add to Lot {lotNumber}
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
