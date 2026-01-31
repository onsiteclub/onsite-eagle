import { NextRequest, NextResponse } from 'next/server'

interface LotData {
  lot_number: string | null
  position: {
    x_percent: number
    y_percent: number
    width_percent: number
    height_percent: number
  }
  confidence: number
}

interface StreetData {
  name: string | null
  orientation: 'horizontal' | 'vertical' | 'diagonal'
}

interface AnalysisData {
  lots: LotData[]
  streets: StreetData[]
}

export async function POST(request: NextRequest) {
  try {
    const { analysis, width = 800, height = 600 } = await request.json() as {
      analysis: AnalysisData
      width?: number
      height?: number
    }

    if (!analysis || !analysis.lots) {
      return NextResponse.json({ error: 'Invalid analysis data' }, { status: 400 })
    }

    // Generate SVG from analysis
    const svg = generateSVG(analysis, width, height)

    return NextResponse.json({
      success: true,
      svg,
      lot_count: analysis.lots.length
    })

  } catch (error) {
    console.error('SVG generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SVG generation failed' },
      { status: 500 }
    )
  }
}

function generateSVG(analysis: AnalysisData, width: number, height: number): string {
  const lots = analysis.lots || []
  const streets = analysis.streets || []

  // Status colors
  const statusColors: Record<string, string> = {
    not_started: '#9CA3AF',  // gray
    in_progress: '#FCD34D',  // yellow
    delayed: '#EF4444',      // red
    completed: '#10B981',    // green
    finished: '#3B82F6'      // blue
  }

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="w-full h-full">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  
  <!-- Grid pattern -->
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  
  <!-- Streets -->
  <g class="streets">`

  // Draw streets (simplified as lines/rectangles)
  streets.forEach((street, i) => {
    const isHorizontal = street.orientation === 'horizontal'
    const y = isHorizontal ? (i + 1) * (height / (streets.length + 2)) : 0
    const x = !isHorizontal ? (i + 1) * (width / (streets.length + 2)) : 0
    
    if (isHorizontal) {
      svgContent += `
    <rect x="0" y="${y - 15}" width="${width}" height="30" fill="#d1d5db" rx="2"/>
    <text x="${width/2}" y="${y + 5}" text-anchor="middle" fill="#6b7280" font-size="12" font-family="Arial">${street.name || `Street ${i + 1}`}</text>`
    } else {
      svgContent += `
    <rect x="${x - 15}" y="0" width="30" height="${height}" fill="#d1d5db" rx="2"/>
    <text x="${x}" y="${height/2}" text-anchor="middle" fill="#6b7280" font-size="12" font-family="Arial" transform="rotate(-90, ${x}, ${height/2})">${street.name || `Street ${i + 1}`}</text>`
    }
  })

  svgContent += `
  </g>
  
  <!-- Lots -->
  <g class="lots">`

  // Draw lots
  lots.forEach((lot, i) => {
    const x = (lot.position.x_percent / 100) * width
    const y = (lot.position.y_percent / 100) * height
    const w = (lot.position.width_percent / 100) * width
    const h = (lot.position.height_percent / 100) * height
    
    const lotNum = lot.lot_number || `${i + 1}`
    const status = 'not_started' // Default status
    const fillColor = statusColors[status]

    svgContent += `
    <g class="lot" data-lot="${lotNum}" data-status="${status}">
      <rect 
        x="${x}" y="${y}" 
        width="${w}" height="${h}" 
        fill="${fillColor}" 
        stroke="#374151" 
        stroke-width="2" 
        rx="4"
        class="lot-rect cursor-pointer hover:opacity-80 transition-opacity"
      />
      <text 
        x="${x + w/2}" y="${y + h/2}" 
        text-anchor="middle" 
        dominant-baseline="middle"
        fill="#1f2937" 
        font-size="14" 
        font-weight="bold"
        font-family="Arial"
        class="pointer-events-none"
      >${lotNum}</text>
    </g>`
  })

  svgContent += `
  </g>
  
  <!-- Legend -->
  <g class="legend" transform="translate(${width - 150}, 20)">
    <rect x="0" y="0" width="140" height="130" fill="white" stroke="#e5e7eb" rx="4"/>
    <text x="10" y="20" font-size="12" font-weight="bold" fill="#374151">Status</text>
    
    <rect x="10" y="30" width="16" height="16" fill="${statusColors.not_started}" rx="2"/>
    <text x="32" y="43" font-size="11" fill="#6b7280">Not Started</text>
    
    <rect x="10" y="52" width="16" height="16" fill="${statusColors.in_progress}" rx="2"/>
    <text x="32" y="65" font-size="11" fill="#6b7280">In Progress</text>
    
    <rect x="10" y="74" width="16" height="16" fill="${statusColors.delayed}" rx="2"/>
    <text x="32" y="87" font-size="11" fill="#6b7280">Delayed</text>
    
    <rect x="10" y="96" width="16" height="16" fill="${statusColors.completed}" rx="2"/>
    <text x="32" y="109" font-size="11" fill="#6b7280">Completed</text>
  </g>
</svg>`

  return svgContent
}
