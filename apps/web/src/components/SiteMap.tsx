'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { House, Site } from '@/types/database'

interface SiteMapProps {
  siteId?: string
  svgData?: string
  houses?: House[]
  onHouseClick?: (house: House) => void
  editable?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  not_started: '#9CA3AF',
  in_progress: '#FCD34D', 
  delayed: '#EF4444',
  completed: '#10B981',
  finished: '#3B82F6'
}

export default function SiteMap({ 
  siteId, 
  svgData: initialSvg, 
  houses: initialHouses,
  onHouseClick,
  editable = false
}: SiteMapProps) {
  const [svg, setSvg] = useState<string>(initialSvg || '')
  const [houses, setHouses] = useState<House[]>(initialHouses || [])
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
        .from('sites')
        .select('svg_data')
        .eq('id', siteId)
        .single()
      
      if (site?.svg_data) {
        setSvg(site.svg_data)
      }

      // Fetch houses
      const { data: housesData } = await supabase
        .from('houses')
        .select('*')
        .eq('site_id', siteId)
        .order('lot_number')

      if (housesData) {
        setHouses(housesData)
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
            rect.setAttribute('fill', STATUS_COLORS[house.status] || STATUS_COLORS.not_started)
            rect.setAttribute('data-house-id', house.id)
          }
          
          // Add click handler
          lot.addEventListener('click', () => handleLotClick(house))
        }
      })
    }, 100)
  }, [svg, houses])

  const handleLotClick = (house: House) => {
    setSelectedHouse(house)
    if (onHouseClick) {
      onHouseClick(house)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-xl text-gray-500">
        <p>No site map available</p>
        <p className="text-sm mt-2">Upload a subdivision plan to generate the map</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* SVG Map */}
      <div 
        ref={containerRef}
        className="bg-white rounded-xl shadow-sm border overflow-hidden"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {/* Selected House Info */}
      {selectedHouse && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border p-4 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-lg">Lot {selectedHouse.lot_number}</h4>
            <button 
              onClick={() => setSelectedHouse(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium capitalize px-2 py-0.5 rounded text-xs`}
                style={{ 
                  backgroundColor: STATUS_COLORS[selectedHouse.status] + '30',
                  color: selectedHouse.status === 'not_started' ? '#4B5563' : STATUS_COLORS[selectedHouse.status]
                }}>
                {selectedHouse.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Progress:</span>
              <span className="font-medium">{selectedHouse.progress_percentage}%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Phase:</span>
              <span className="font-medium">{selectedHouse.current_phase}/7</span>
            </div>

            {selectedHouse.address && (
              <div className="flex justify-between">
                <span className="text-gray-600">Address:</span>
                <span className="font-medium text-xs">{selectedHouse.address}</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => onHouseClick?.(selectedHouse)}
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            View Details
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow border p-3">
        <div className="text-xs font-semibold text-gray-700 mb-2">Status Legend</div>
        <div className="space-y-1.5">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600 capitalize">
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
