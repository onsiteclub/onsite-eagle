import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a client with service role for public access
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getServiceClient()

    // Fetch site data
    const { data: site, error: siteError } = await supabase
      .from('egl_sites')
      .select('id, name, city, svg_data, total_lots, completed_lots')
      .eq('id', id)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Fetch houses with minimal data (only what's needed for the map)
    const { data: houses, error: housesError } = await supabase
      .from('egl_houses')
      .select('id, lot_number, status, progress_percentage, coordinates')
      .eq('site_id', id)
      .order('lot_number')

    if (housesError) {
      return NextResponse.json(
        { error: 'Failed to fetch lots' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      site,
      houses: houses || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Public site API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
