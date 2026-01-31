'use client'

import { useState } from 'react'
import { 
  Map, Camera, FileText, Home, 
  BarChart3, Bell, ChevronRight,
  Upload, Eye
} from 'lucide-react'
import PlanScanner from '@/components/PlanScanner'
import PhotoValidator from '@/components/PhotoValidator'
import SiteMap from '@/components/SiteMap'
import Timeline from '@/components/Timeline'
import type { TimelineEvent } from '@/types/database'

type TabType = 'dashboard' | 'scan-plan' | 'validate-photo' | 'timeline'

// Demo data for timeline
const DEMO_EVENTS: TimelineEvent[] = [
  {
    id: '1',
    house_id: 'demo',
    event_type: 'status_change',
    title: 'Site Created',
    description: 'OnSite Eagle project initialized',
    source: 'system',
    source_link: null,
    metadata: null,
    created_by: null,
    created_at: new Date().toISOString()
  }
]

// Demo SVG for the site map
const DEMO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" class="w-full h-full">
  <rect width="800" height="500" fill="#f8fafc"/>
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="800" height="500" fill="url(#grid)"/>
  
  <!-- Street -->
  <rect x="0" y="220" width="800" height="60" fill="#d1d5db" rx="2"/>
  <text x="400" y="255" text-anchor="middle" fill="#6b7280" font-size="14" font-family="Arial">MAIN STREET</text>
  
  <!-- Top Row Houses -->
  <g class="lot" data-lot="1" data-status="completed">
    <rect x="50" y="50" width="100" height="140" fill="#10B981" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="100" y="125" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">1</text>
  </g>
  <g class="lot" data-lot="2" data-status="in_progress">
    <rect x="170" y="50" width="100" height="140" fill="#FCD34D" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="220" y="125" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">2</text>
  </g>
  <g class="lot" data-lot="3" data-status="in_progress">
    <rect x="290" y="50" width="100" height="140" fill="#FCD34D" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="340" y="125" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">3</text>
  </g>
  <g class="lot" data-lot="4" data-status="delayed">
    <rect x="410" y="50" width="100" height="140" fill="#EF4444" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="460" y="125" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">4</text>
  </g>
  <g class="lot" data-lot="5" data-status="not_started">
    <rect x="530" y="50" width="100" height="140" fill="#9CA3AF" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="580" y="125" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">5</text>
  </g>
  <g class="lot" data-lot="6" data-status="not_started">
    <rect x="650" y="50" width="100" height="140" fill="#9CA3AF" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="700" y="125" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">6</text>
  </g>
  
  <!-- Bottom Row Houses -->
  <g class="lot" data-lot="7" data-status="completed">
    <rect x="50" y="310" width="100" height="140" fill="#10B981" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="100" y="385" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">7</text>
  </g>
  <g class="lot" data-lot="8" data-status="completed">
    <rect x="170" y="310" width="100" height="140" fill="#10B981" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="220" y="385" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">8</text>
  </g>
  <g class="lot" data-lot="9" data-status="in_progress">
    <rect x="290" y="310" width="100" height="140" fill="#FCD34D" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="340" y="385" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">9</text>
  </g>
  <g class="lot" data-lot="10" data-status="not_started">
    <rect x="410" y="310" width="100" height="140" fill="#9CA3AF" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="460" y="385" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">10</text>
  </g>
  <g class="lot" data-lot="11" data-status="not_started">
    <rect x="530" y="310" width="100" height="140" fill="#9CA3AF" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="580" y="385" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">11</text>
  </g>
  <g class="lot" data-lot="12" data-status="not_started">
    <rect x="650" y="310" width="100" height="140" fill="#9CA3AF" stroke="#374151" stroke-width="2" rx="4" class="lot-rect cursor-pointer hover:opacity-80"/>
    <text x="700" y="385" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="bold">12</text>
  </g>
</svg>`

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [generatedSvg, setGeneratedSvg] = useState<string | null>(null)

  const handleAnalysisComplete = (analysis: unknown, svg: string) => {
    setGeneratedSvg(svg)
  }

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'scan-plan' as const, label: 'Scan Plan', icon: Map },
    { id: 'validate-photo' as const, label: 'Validate Photo', icon: Camera },
    { id: 'timeline' as const, label: 'Timeline', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-lg">OnSite Eagle</h1>
                <p className="text-xs text-gray-400">Construction Vision</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-orange-500 text-white' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className={`w-5 h-5 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === 'dashboard' && 'Overview of all construction sites'}
              {activeTab === 'scan-plan' && 'Upload subdivision plan for AI analysis'}
              {activeTab === 'validate-photo' && 'Validate construction phase photos'}
              {activeTab === 'timeline' && 'Chronological activity log'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
              C
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Houses</p>
                      <p className="text-3xl font-bold text-gray-900">12</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Home className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">In Progress</p>
                      <p className="text-3xl font-bold text-yellow-500">4</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Completed</p>
                      <p className="text-3xl font-bold text-green-500">3</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Eye className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Delayed</p>
                      <p className="text-3xl font-bold text-red-500">1</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Site Map */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Map className="w-5 h-5 text-orange-500" />
                  Site Overview - Demo Subdivision
                </h3>
                <SiteMap svgData={generatedSvg || DEMO_SVG} />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('scan-plan')}
                  className="bg-white rounded-xl shadow-sm border p-6 hover:border-orange-500 transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                      <Upload className="w-6 h-6 text-orange-600 group-hover:text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Scan New Plan</h4>
                      <p className="text-sm text-gray-500">Upload subdivision plan for AI analysis</p>
                    </div>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('validate-photo')}
                  className="bg-white rounded-xl shadow-sm border p-6 hover:border-orange-500 transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                      <Camera className="w-6 h-6 text-blue-600 group-hover:text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Validate Photo</h4>
                      <p className="text-sm text-gray-500">Check construction phase with AI</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'scan-plan' && (
            <PlanScanner onAnalysisComplete={handleAnalysisComplete} />
          )}

          {activeTab === 'validate-photo' && (
            <PhotoValidator />
          )}

          {activeTab === 'timeline' && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <Timeline events={DEMO_EVENTS} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
