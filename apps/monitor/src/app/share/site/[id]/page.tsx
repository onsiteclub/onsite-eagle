'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Building2, Radio, RefreshCw, Send, Loader2, BarChart3, PieChart, TrendingUp, Hash } from 'lucide-react'

// Types
interface Site {
  id: string
  name: string
  city: string
  svg_data: string | null
  total_lots: number
  completed_lots: number
}

interface House {
  id: string
  lot_number: string
  status: 'not_started' | 'in_progress' | 'delayed' | 'completed' | 'on_hold'
  progress_percentage: number
  coordinates: { x: number; y: number; width: number; height: number } | null
}

interface ChartData {
  label: string
  value: number
  color?: string
}

interface AIResponse {
  type: 'bar_chart' | 'pie_chart' | 'metrics' | 'progress' | 'comparison'
  title: string
  data: ChartData[]
  total?: number
  unit?: string
  summary?: string
}

// Status colors
const STATUS_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  not_started: { fill: '#E5E5EA', stroke: '#AEAEB2', label: 'Not Started' },
  in_progress: { fill: '#FF9500', stroke: '#CC7700', label: 'In Progress' },
  delayed: { fill: '#FF3B30', stroke: '#CC2F26', label: 'Delayed' },
  completed: { fill: '#34C759', stroke: '#2AA147', label: 'Completed' },
  on_hold: { fill: '#8E8E93', stroke: '#636366', label: 'On Hold' },
}

// Create Supabase client for realtime (using anon key)
function createRealtimeClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export default function PublicSiteMapPage() {
  const params = useParams()
  const siteId = params.id as string

  const [site, setSite] = useState<Site | null>(null)
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isLive, setIsLive] = useState(false)
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null)

  // AI Q&A state
  const [question, setQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/site/${siteId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch site data')
      }
      const data = await response.json()
      setSite(data.site)
      setHouses(data.houses)
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Setup realtime subscription
  useEffect(() => {
    const supabase = createRealtimeClient()
    if (!supabase || !siteId) return

    // Subscribe to house changes for this site
    const channel = supabase
      .channel(`public-site-${siteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'egl_houses',
          filter: `site_id=eq.${siteId}`
        },
        (payload) => {
          console.log('Realtime update:', payload)
          setLastUpdate(new Date())

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedHouse = payload.new as House
            setHouses(prev => {
              const idx = prev.findIndex(h => h.id === updatedHouse.id)
              if (idx >= 0) {
                const newHouses = [...prev]
                newHouses[idx] = updatedHouse
                return newHouses
              }
              return [...prev, updatedHouse]
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setHouses(prev => prev.filter(h => h.id !== deletedId))
          }
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [siteId])

  // Ask AI question
  const askAI = async (q?: string) => {
    const questionToAsk = q || question
    if (!questionToAsk.trim() || aiLoading) return

    setAiLoading(true)
    setAiError(null)
    setAiResponse(null)

    try {
      const response = await fetch('/api/public/site-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionToAsk, siteId }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      setAiResponse(data.response)
      setQuestion('')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setAiLoading(false)
    }
  }

  // Calculate stats
  const stats = {
    total: houses.length,
    completed: houses.filter(h => h.status === 'completed').length,
    inProgress: houses.filter(h => h.status === 'in_progress').length,
    delayed: houses.filter(h => h.status === 'delayed').length,
    notStarted: houses.filter(h => h.status === 'not_started').length,
    onHold: houses.filter(h => h.status === 'on_hold').length,
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1D1D1F] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF] mx-auto mb-4" />
          <p className="text-white/60">Loading site map...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !site) {
    return (
      <div className="min-h-screen bg-[#1D1D1F] flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <p className="text-white text-xl font-medium mb-2">Site Not Found</p>
          <p className="text-white/60">{error || 'This site does not exist or has been removed.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1D1D1F] text-white">
      {/* Header */}
      <header className="bg-[#2C2C2E] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{site.name}</h1>
              <p className="text-white/60 text-sm">{site.city}</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Live indicator */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                isLive ? 'bg-[#34C759]/20 text-[#34C759]' : 'bg-white/10 text-white/60'
              }`}>
                <Radio className={`w-4 h-4 ${isLive ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-medium">{isLive ? 'LIVE' : 'Connecting...'}</span>
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchData}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-3">
            <div className="bg-[#2C2C2E] rounded-2xl p-6">
              {site.svg_data ? (
                <div className="relative">
                  {/* SVG Map */}
                  <div
                    className="w-full"
                    dangerouslySetInnerHTML={{ __html: site.svg_data }}
                  />

                  {/* Lot overlays */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ aspectRatio: '16/9' }}
                    viewBox="0 0 1000 562"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {houses.map(house => {
                      if (!house.coordinates) return null
                      const { x, y, width, height } = house.coordinates
                      const colors = STATUS_COLORS[house.status] || STATUS_COLORS.not_started

                      return (
                        <g
                          key={house.id}
                          className="pointer-events-auto cursor-pointer"
                          onClick={() => setSelectedHouse(selectedHouse?.id === house.id ? null : house)}
                        >
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={colors.fill}
                            fillOpacity={0.7}
                            stroke={selectedHouse?.id === house.id ? '#FFFFFF' : colors.stroke}
                            strokeWidth={selectedHouse?.id === house.id ? 3 : 1.5}
                            rx={4}
                            className="transition-all duration-200 hover:fill-opacity-90"
                          />
                          <text
                            x={x + width / 2}
                            y={y + height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#FFFFFF"
                            fontSize={Math.min(width, height) * 0.4}
                            fontWeight="600"
                            className="pointer-events-none"
                          >
                            {house.lot_number}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
              ) : (
                <div className="aspect-video bg-[#1D1D1F] rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Building2 className="w-16 h-16 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">No map available</p>
                  </div>
                </div>
              )}

              {/* Selected house info */}
              {selectedHouse && (
                <div className="mt-4 p-4 bg-[#1D1D1F] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">Lot {selectedHouse.lot_number}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[selectedHouse.status].fill }}
                        />
                        <span className="text-white/60 text-sm">
                          {STATUS_COLORS[selectedHouse.status].label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[#007AFF]">
                        {Math.round(selectedHouse.progress_percentage)}%
                      </span>
                      <p className="text-white/40 text-sm">Progress</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            {/* Progress Card */}
            <div className="bg-[#2C2C2E] rounded-2xl p-5">
              <h3 className="text-white/60 text-sm font-medium mb-3">Overall Progress</h3>
              <div className="text-3xl font-bold text-[#007AFF] mb-2">
                {site.total_lots > 0
                  ? Math.round((site.completed_lots / site.total_lots) * 100)
                  : 0}%
              </div>
              <div className="h-2 bg-[#1D1D1F] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#007AFF] rounded-full transition-all duration-500"
                  style={{
                    width: `${site.total_lots > 0 ? (site.completed_lots / site.total_lots) * 100 : 0}%`
                  }}
                />
              </div>
              <p className="text-white/40 text-sm mt-2">
                {site.completed_lots} of {site.total_lots} lots completed
              </p>
            </div>

            {/* Status Breakdown */}
            <div className="bg-[#2C2C2E] rounded-2xl p-5">
              <h3 className="text-white/60 text-sm font-medium mb-4">Status Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(STATUS_COLORS).map(([status, colors]) => {
                  const count = houses.filter(h => h.status === status).length
                  if (count === 0) return null

                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors.fill }}
                        />
                        <span className="text-white/80 text-sm">{colors.label}</span>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Last Update */}
            <div className="bg-[#2C2C2E] rounded-2xl p-5">
              <h3 className="text-white/60 text-sm font-medium mb-2">Last Update</h3>
              <p className="text-white/80">
                {lastUpdate.toLocaleTimeString('en-CA', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
              <p className="text-white/40 text-sm">
                {lastUpdate.toLocaleDateString('en-CA', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Legend */}
            <div className="bg-[#2C2C2E] rounded-2xl p-5">
              <h3 className="text-white/60 text-sm font-medium mb-4">Legend</h3>
              <div className="space-y-2">
                {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: colors.fill }}
                    />
                    <span className="text-white/60 text-sm">{colors.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Q&A Section */}
        <div className="mt-6">
          <div className="bg-[#2C2C2E] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[#007AFF]" />
              <h3 className="text-white font-medium">Ask Eagle AI</h3>
            </div>

            {/* Question Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askAI()}
                placeholder="Ask about progress, delays, status..."
                className="flex-1 bg-[#1D1D1F] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#007AFF]"
              />
              <button
                onClick={() => askAI()}
                disabled={aiLoading || !question.trim()}
                className="px-4 py-3 bg-[#007AFF] rounded-xl hover:bg-[#0066CC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {aiLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2 mb-4">
              {['Status breakdown', 'How many delayed?', 'Overall progress', 'Lots per phase'].map((q) => (
                <button
                  key={q}
                  onClick={() => askAI(q)}
                  disabled={aiLoading}
                  className="px-3 py-1.5 bg-[#1D1D1F] rounded-lg text-white/60 text-sm hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* AI Error */}
            {aiError && (
              <div className="bg-[#FF3B30]/20 text-[#FF3B30] rounded-xl p-4 mb-4">
                {aiError}
              </div>
            )}

            {/* AI Response - Chart Display */}
            {aiResponse && (
              <div className="bg-[#1D1D1F] rounded-xl p-4">
                {/* Title */}
                <div className="flex items-center gap-2 mb-4">
                  {aiResponse.type === 'bar_chart' && <BarChart3 className="w-5 h-5 text-[#007AFF]" />}
                  {aiResponse.type === 'pie_chart' && <PieChart className="w-5 h-5 text-[#007AFF]" />}
                  {aiResponse.type === 'progress' && <TrendingUp className="w-5 h-5 text-[#007AFF]" />}
                  {aiResponse.type === 'metrics' && <Hash className="w-5 h-5 text-[#007AFF]" />}
                  {aiResponse.type === 'comparison' && <BarChart3 className="w-5 h-5 text-[#007AFF]" />}
                  <h4 className="text-white font-medium">{aiResponse.title}</h4>
                </div>

                {/* Bar Chart */}
                {(aiResponse.type === 'bar_chart' || aiResponse.type === 'comparison') && (
                  <div className="space-y-3">
                    {aiResponse.data.map((item, idx) => {
                      const maxValue = Math.max(...aiResponse.data.map(d => d.value))
                      const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-white/60">{item.label}</span>
                            <span className="text-white font-medium">{item.value}{aiResponse.unit === '%' ? '%' : ''}</span>
                          </div>
                          <div className="h-6 bg-[#2C2C2E] rounded overflow-hidden">
                            <div
                              className="h-full rounded transition-all duration-500"
                              style={{
                                width: `${width}%`,
                                backgroundColor: item.color || '#007AFF'
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Pie Chart (as donut segments) */}
                {aiResponse.type === 'pie_chart' && (
                  <div className="flex items-center gap-6">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {(() => {
                          const total = aiResponse.data.reduce((sum, d) => sum + d.value, 0)
                          let currentAngle = 0
                          return aiResponse.data.map((item, idx) => {
                            if (item.value === 0) return null
                            const angle = (item.value / total) * 360
                            const startAngle = currentAngle
                            currentAngle += angle

                            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
                            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
                            const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180)
                            const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180)
                            const largeArc = angle > 180 ? 1 : 0

                            return (
                              <path
                                key={idx}
                                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={item.color || '#007AFF'}
                                className="hover:opacity-80 transition-opacity"
                              />
                            )
                          })
                        })()}
                        <circle cx="50" cy="50" r="25" fill="#1D1D1F" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{aiResponse.total || aiResponse.data.reduce((s, d) => s + d.value, 0)}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {aiResponse.data.filter(d => d.value > 0).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || '#007AFF' }} />
                            <span className="text-white/60 text-sm">{item.label}</span>
                          </div>
                          <span className="text-white font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress */}
                {aiResponse.type === 'progress' && aiResponse.data[0] && (
                  <div>
                    <div className="text-4xl font-bold text-[#007AFF] mb-2">
                      {aiResponse.data[0].value}{aiResponse.unit === '%' ? '%' : ''}
                    </div>
                    <div className="h-3 bg-[#2C2C2E] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(aiResponse.data[0].value, 100)}%`,
                          backgroundColor: aiResponse.data[0].color || '#007AFF'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Metrics */}
                {aiResponse.type === 'metrics' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {aiResponse.data.map((item, idx) => (
                      <div key={idx} className="bg-[#2C2C2E] rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold" style={{ color: item.color || '#007AFF' }}>
                          {item.value}
                        </div>
                        <div className="text-white/60 text-sm mt-1">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                {aiResponse.summary && (
                  <div className="mt-4 pt-4 border-t border-white/10 text-white/60 text-sm">
                    {aiResponse.summary}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#2C2C2E] border-t border-white/10 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-white/40 text-sm">
            <span>OnSite Eagle - Live Site View</span>
            <span>Real-time construction monitoring</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
