import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

interface ReportContext {
  site: {
    id: string
    name: string
    city: string
    total_lots: number
    completed_lots: number
    start_date: string | null
    expected_end_date: string | null
  }
  house?: {
    id: string
    lot_number: string
    status: string
    current_phase: number
    progress_percentage: number
    address?: string
  }
  houses: Array<{
    id: string
    lot_number: string
    status: string
    current_phase: number
    progress_percentage: number
  }>
  stats: {
    total_houses: number
    completed: number
    in_progress: number
    delayed: number
    not_started: number
    on_hold: number
    avg_progress: number
  }
  messages: Array<{
    sender_type: string
    sender_name: string
    content: string
    created_at: string
  }>
  timeline: Array<{
    event_type: string
    title: string
    description?: string
    house_id: string
    created_at: string
  }>
  photos: Array<{
    house_id: string
    phase_id: string
    ai_validation_status: string
    created_at: string
  }>
  period_days: number
}

function buildReportPrompt(context: ReportContext, reportType: string) {
  const { site, stats, houses, messages, timeline, photos, period_days } = context

  // Calculate progress change (simplified - in production would compare to previous period)
  const progressPct = site.total_lots > 0
    ? Math.round((site.completed_lots / site.total_lots) * 100)
    : 0

  // Identify delayed lots
  const delayedLots = houses.filter(h => h.status === 'delayed')

  // Count events by type
  const eventCounts = timeline.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Photo validation stats
  const photoStats = {
    total: photos.length,
    approved: photos.filter(p => p.ai_validation_status === 'approved').length,
    rejected: photos.filter(p => p.ai_validation_status === 'rejected').length,
    pending: photos.filter(p => p.ai_validation_status === 'pending').length,
  }

  return `You are Eagle AI, generating a ${reportType} construction progress report.

## Site Information
- **Site:** ${site.name} (${site.city})
- **Report Period:** Last ${period_days} days
- **Total Lots:** ${site.total_lots}
- **Overall Progress:** ${progressPct}%

## Current Status
- Completed: ${stats.completed} lots
- In Progress: ${stats.in_progress} lots
- Delayed: ${stats.delayed} lots
- Not Started: ${stats.not_started} lots
- On Hold: ${stats.on_hold} lots
- Average Progress: ${stats.avg_progress}%

## Delayed Lots
${delayedLots.length > 0
    ? delayedLots.map(l => `- Lot ${l.lot_number}: Phase ${l.current_phase}, ${l.progress_percentage}% complete`).join('\n')
    : '- No delayed lots'}

## Activity This Period
- Timeline events: ${timeline.length}
- Photos uploaded: ${photos.length} (${photoStats.approved} approved, ${photoStats.rejected} rejected, ${photoStats.pending} pending)
- Messages: ${messages.length}

## Recent Messages
${messages.slice(0, 10).map(m => `[${m.sender_type}] ${m.sender_name}: ${m.content}`).join('\n')}

## Instructions
Generate a professional ${reportType} report with the following JSON structure:

{
  "title": "Short descriptive title",
  "summary": "2-3 sentence executive summary",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content (can use markdown)",
      "type": "progress|delays|issues|recommendations"
    }
  ],
  "highlights": [
    {"type": "positive|negative|neutral", "text": "Key finding"}
  ],
  "recommendations": [
    {"priority": "high|medium|low", "action": "What to do", "reason": "Why"}
  ],
  "metrics": {
    "total_lots": ${site.total_lots},
    "completed": ${stats.completed},
    "in_progress": ${stats.in_progress},
    "delayed": ${stats.delayed},
    "progress_pct": ${progressPct},
    "photos_uploaded": ${photos.length},
    "photos_approved": ${photoStats.approved}
  }
}

Be specific, actionable, and highlight both successes and concerns. Focus on what matters to a construction supervisor.`
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { siteId, houseId, reportType = 'weekly', days = 7 } = await request.json()

    if (!siteId) {
      return NextResponse.json(
        { error: 'Missing siteId' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get context using the database function
    const { data: contextData, error: contextError } = await supabase
      .rpc('get_report_context', {
        p_site_id: siteId,
        p_house_id: houseId || null,
        p_days: days,
      })

    if (contextError) {
      // Fallback: get data manually if function doesn't exist yet
      const { data: site } = await supabase
        .from('egl_sites')
        .select('*')
        .eq('id', siteId)
        .single()

      const { data: houses } = await supabase
        .from('egl_houses')
        .select('*')
        .eq('site_id', siteId)

      const context: ReportContext = {
        site: site || { id: siteId, name: 'Unknown', city: '', total_lots: 0, completed_lots: 0, start_date: null, expected_end_date: null },
        houses: houses || [],
        stats: {
          total_houses: houses?.length || 0,
          completed: houses?.filter(h => h.status === 'completed').length || 0,
          in_progress: houses?.filter(h => h.status === 'in_progress').length || 0,
          delayed: houses?.filter(h => h.status === 'delayed').length || 0,
          not_started: houses?.filter(h => h.status === 'not_started').length || 0,
          on_hold: houses?.filter(h => h.status === 'on_hold').length || 0,
          avg_progress: houses?.length ? houses.reduce((sum, h) => sum + (h.progress_percentage || 0), 0) / houses.length : 0,
        },
        messages: [],
        timeline: [],
        photos: [],
        period_days: days,
      }

      // Generate report
      const prompt = buildReportPrompt(context, reportType)

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Eagle AI, a construction site analysis expert. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      })

      const reportContent = JSON.parse(completion.choices[0]?.message?.content || '{}')
      const generationTime = Date.now() - startTime

      // Calculate period dates
      const periodEnd = new Date()
      const periodStart = new Date()
      periodStart.setDate(periodStart.getDate() - days)

      // Save report to database
      const { data: report, error: saveError } = await supabase
        .from('egl_ai_reports')
        .insert({
          site_id: siteId,
          house_id: houseId || null,
          report_type: reportType,
          title: reportContent.title || `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
          summary: reportContent.summary || 'Report generated successfully.',
          full_report: completion.choices[0]?.message?.content || '',
          sections: reportContent.sections || [],
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          metrics: reportContent.metrics || context.stats,
          highlights: reportContent.highlights || [],
          recommendations: reportContent.recommendations || [],
          ai_model: 'gpt-4o-mini',
          generation_time_ms: generationTime,
          status: 'generated',
        })
        .select()
        .single()

      if (saveError) {
        console.error('Error saving report:', saveError)
        // Return the report even if save fails
        return NextResponse.json({
          success: true,
          report: {
            ...reportContent,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            generation_time_ms: generationTime,
          },
          saved: false,
        })
      }

      return NextResponse.json({
        success: true,
        report: report,
        saved: true,
      })
    }

    // Use context from database function
    const context = contextData as ReportContext
    const prompt = buildReportPrompt(context, reportType)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are Eagle AI, a construction site analysis expert. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const reportContent = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const generationTime = Date.now() - startTime

    // Calculate period dates
    const periodEnd = new Date()
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - days)

    // Save report to database
    const { data: report, error: saveError } = await supabase
      .from('egl_ai_reports')
      .insert({
        site_id: siteId,
        house_id: houseId || null,
        report_type: reportType,
        title: reportContent.title || `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        summary: reportContent.summary || 'Report generated successfully.',
        full_report: completion.choices[0]?.message?.content || '',
        sections: reportContent.sections || [],
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        metrics: reportContent.metrics || context.stats,
        highlights: reportContent.highlights || [],
        recommendations: reportContent.recommendations || [],
        ai_model: 'gpt-4o-mini',
        generation_time_ms: generationTime,
        status: 'generated',
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving report:', saveError)
    }

    return NextResponse.json({
      success: true,
      report: report || reportContent,
      saved: !saveError,
    })

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Report generation failed' },
      { status: 500 }
    )
  }
}

// GET: Fetch existing reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const houseId = searchParams.get('houseId')
    const reportType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!siteId) {
      return NextResponse.json(
        { error: 'Missing siteId' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    let query = supabase
      .from('egl_ai_reports')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (houseId) {
      query = query.eq('house_id', houseId)
    }

    if (reportType) {
      query = query.eq('report_type', reportType)
    }

    const { data: reports, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reports: reports || [],
    })

  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
