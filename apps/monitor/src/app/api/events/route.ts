import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch events for a site/house
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('siteId')
  const houseId = searchParams.get('houseId')

  if (!siteId && !houseId) {
    return NextResponse.json({ error: 'siteId or houseId is required' }, { status: 400 })
  }

  let query = supabase
    .from('egl_external_events')
    .select('*')
    .order('event_date', { ascending: true })

  if (houseId) {
    query = query.eq('house_id', houseId)
  } else if (siteId) {
    query = query.eq('site_id', siteId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Create a new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { site_id, house_id, event_type, title, description, event_date, source } = body

    if (!title || !event_date) {
      return NextResponse.json(
        { error: 'Missing required fields: title, event_date' },
        { status: 400 }
      )
    }

    if (!site_id && !house_id) {
      return NextResponse.json(
        { error: 'Either site_id or house_id is required' },
        { status: 400 }
      )
    }

    // Valid event types in database constraint
    const validDbEventTypes = [
      'weather_snow', 'weather_rain', 'weather_extreme_cold', 'weather_extreme_heat', 'weather_wind',
      'holiday', 'permit_delay', 'inspection_scheduled', 'inspection_failed', 'inspection_passed',
      'material_delay', 'material_shortage', 'material_delivered',
      'worker_sick', 'worker_no_show', 'worker_injury', 'worker_change', 'crew_shortage',
      'site_access_blocked', 'utility_issue', 'design_change', 'client_request', 'other'
    ]

    // Map simple/AI types to valid event_type values
    const eventTypeMap: Record<string, string> = {
      'inspection': 'inspection_scheduled',
      'delivery': 'material_delivered',
      'meeting': 'other',
    }

    // Use the mapped type, or if the provided type is already valid, use it directly
    let validEventType = 'other'
    if (event_type) {
      if (validDbEventTypes.includes(event_type)) {
        validEventType = event_type
      } else if (eventTypeMap[event_type]) {
        validEventType = eventTypeMap[event_type]
      }
    }

    const { data, error } = await supabase
      .from('egl_external_events')
      .insert({
        site_id: site_id || null,
        house_id: house_id || null,
        event_type: validEventType,
        title,
        description: description || null,
        event_date,
        source: source || 'ai_detected',
        impact_severity: 'none',
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/events:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
