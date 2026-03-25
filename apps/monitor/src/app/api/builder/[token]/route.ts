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
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getServiceClient()

    // Validate token via RPC
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('lookup_builder_token', { p_token: token })

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { valid: false, error: 'Invalid link' },
        { status: 404 }
      )
    }

    const t = tokenData

    // Check if access was revoked
    if (!t.is_active) {
      return NextResponse.json(
        { valid: false, error: 'Access revoked' },
        { status: 403 }
      )
    }

    // Check if link expired
    if (t.expires_at && new Date(t.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Link expired' },
        { status: 403 }
      )
    }

    // Record access (fire and forget)
    supabase.rpc('record_builder_access', { p_token_id: t.id })

    // Fetch jobsite data (sanitized — no payment, crew, or internal data)
    const { data: jobsite, error: jobsiteError } = await supabase
      .from('frm_jobsites')
      .select('id, name, builder_name, city, svg_data, total_lots, completed_lots, status, start_date, expected_end_date')
      .eq('id', t.jobsite_id)
      .single()

    if (jobsiteError || !jobsite) {
      return NextResponse.json(
        { valid: false, error: 'Invalid link' },
        { status: 404 }
      )
    }

    // Fetch lots (minimal data only)
    const { data: lots, error: lotsError } = await supabase
      .from('frm_lots')
      .select('id, lot_number, status, current_phase, coordinates')
      .eq('jobsite_id', t.jobsite_id)
      .order('lot_number')

    if (lotsError) {
      return NextResponse.json(
        { valid: false, error: 'Internal server error' },
        { status: 500 }
      )
    }

    const lotList = lots || []
    const lotIds = lotList.map((l) => l.id)

    // Fetch open safety checks count
    let safetyOpen = 0
    if (lotIds.length > 0) {
      const { count } = await supabase
        .from('frm_safety_checks')
        .select('*', { count: 'exact', head: true })
        .in('lot_id', lotIds)
        .eq('status', 'open')

      safetyOpen = count ?? 0
    }

    // Fetch recent milestones (sanitized event types only)
    let milestones: { title: string; date: string; type: string }[] = []
    if (lotIds.length > 0) {
      const { data: timelineData } = await supabase
        .from('frm_timeline')
        .select('title, event_type, created_at')
        .in('lot_id', lotIds)
        .in('event_type', ['status_change', 'phase_completed', 'inspection_passed', 'gate_check_passed'])
        .order('created_at', { ascending: false })
        .limit(20)

      milestones = (timelineData || []).map((e) => ({
        title: e.title,
        date: e.created_at,
        type: e.event_type,
      }))
    }

    // Compute phase distribution
    const phases: Record<string, number> = {}
    for (const lot of lotList) {
      const phase = lot.current_phase || 'unknown'
      phases[phase] = (phases[phase] || 0) + 1
    }

    return NextResponse.json({
      valid: true,
      builder_name: t.builder_name,
      jobsite: {
        name: jobsite.name,
        builder_name: jobsite.builder_name,
        city: jobsite.city,
        svg_data: jobsite.svg_data,
        total_lots: jobsite.total_lots,
        completed_lots: jobsite.completed_lots,
        status: jobsite.status,
        start_date: jobsite.start_date,
        expected_end_date: jobsite.expected_end_date,
      },
      lots: lotList.map((l) => ({
        id: l.id,
        lot_number: l.lot_number,
        status: l.status,
        current_phase: l.current_phase,
        coordinates: l.coordinates,
      })),
      stats: {
        phases,
        safety_open: safetyOpen,
      },
      milestones,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Builder token API error:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
