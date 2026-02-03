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

async function getContext(supabase: ReturnType<typeof getSupabaseClient>, siteId: string) {
  // Get site info
  const { data: site } = await supabase
    .from('egl_sites')
    .select('*')
    .eq('id', siteId)
    .single()

  // Get all houses in site
  const { data: houses } = await supabase
    .from('egl_houses')
    .select('*')
    .eq('site_id', siteId)
    .order('lot_number')

  // Calculate stats
  const stats = {
    total: houses?.length || 0,
    completed: houses?.filter(h => h.status === 'completed').length || 0,
    in_progress: houses?.filter(h => h.status === 'in_progress').length || 0,
    delayed: houses?.filter(h => h.status === 'delayed').length || 0,
    not_started: houses?.filter(h => h.status === 'not_started').length || 0,
    on_hold: houses?.filter(h => h.status === 'on_hold').length || 0,
    avg_progress: houses?.length
      ? Math.round(houses.reduce((sum, h) => sum + (h.progress_percentage || 0), 0) / houses.length)
      : 0,
  }

  // Calculate phases distribution
  const phaseDistribution = houses?.reduce((acc, h) => {
    const phase = h.current_phase || 0
    acc[phase] = (acc[phase] || 0) + 1
    return acc
  }, {} as Record<number, number>) || {}

  // Progress percentage
  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return {
    site,
    houses,
    stats,
    progressPct,
    phaseDistribution,
  }
}

function buildSystemPrompt(context: Awaited<ReturnType<typeof getContext>>) {
  const { site, stats, progressPct, phaseDistribution, houses } = context

  return `You are Eagle AI, a data visualization assistant for construction sites.

CRITICAL RULES:
1. You MUST ONLY respond with valid JSON - no text, no explanations, no conversation
2. Your response must be a chart or metrics visualization
3. NEVER write conversational text or explanations
4. ALL responses must be data-focused with numbers and percentages

## Current Site Data

### Site: ${site?.name || 'Unknown'} (${site?.city || 'Unknown'})
- Total Lots: ${stats.total}
- Progress: ${progressPct}%

### Status Distribution
- Completed: ${stats.completed} (${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)
- In Progress: ${stats.in_progress} (${stats.total > 0 ? Math.round((stats.in_progress / stats.total) * 100) : 0}%)
- Delayed: ${stats.delayed} (${stats.total > 0 ? Math.round((stats.delayed / stats.total) * 100) : 0}%)
- Not Started: ${stats.not_started} (${stats.total > 0 ? Math.round((stats.not_started / stats.total) * 100) : 0}%)
- On Hold: ${stats.on_hold} (${stats.total > 0 ? Math.round((stats.on_hold / stats.total) * 100) : 0}%)

### Phase Distribution
${Object.entries(phaseDistribution).map(([phase, count]) => `- Phase ${phase}: ${count} lots`).join('\n')}

### Average Progress: ${stats.avg_progress}%

### Individual Lot Data
${houses?.slice(0, 20).map(h => `- Lot ${h.lot_number}: ${h.status}, Phase ${h.current_phase || 0}, ${h.progress_percentage || 0}%`).join('\n')}
${(houses?.length || 0) > 20 ? `... and ${(houses?.length || 0) - 20} more lots` : ''}

## Response Format

You MUST respond with a JSON object matching this structure:

{
  "type": "bar_chart" | "pie_chart" | "metrics" | "progress" | "comparison",
  "title": "Short title for the visualization",
  "data": [
    {"label": "Label", "value": 123, "color": "#hexcolor"}
  ],
  "total": 100,
  "unit": "lots" | "%" | "phases",
  "summary": "One short line with key number (optional)"
}

## Color Reference
- Completed: #34C759
- In Progress: #FF9500
- Delayed: #FF3B30
- Not Started: #E5E5EA
- On Hold: #8E8E93
- Blue accent: #007AFF

## Examples of valid responses:

For "how many delayed?":
{"type":"metrics","title":"Delayed Lots","data":[{"label":"Delayed","value":${stats.delayed},"color":"#FF3B30"}],"total":${stats.total},"unit":"lots","summary":"${stats.delayed} of ${stats.total} lots"}

For "show status breakdown":
{"type":"pie_chart","title":"Status Distribution","data":[{"label":"Completed","value":${stats.completed},"color":"#34C759"},{"label":"In Progress","value":${stats.in_progress},"color":"#FF9500"},{"label":"Delayed","value":${stats.delayed},"color":"#FF3B30"},{"label":"Not Started","value":${stats.not_started},"color":"#E5E5EA"},{"label":"On Hold","value":${stats.on_hold},"color":"#8E8E93"}],"total":${stats.total},"unit":"lots"}

For "what's the progress?":
{"type":"progress","title":"Overall Progress","data":[{"label":"Progress","value":${progressPct},"color":"#007AFF"}],"total":100,"unit":"%","summary":"${stats.completed}/${stats.total} completed"}

REMEMBER: Output ONLY valid JSON. No text before or after. No explanations.`
}

export async function POST(request: NextRequest) {
  try {
    const { question, siteId } = await request.json()

    if (!question || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get context
    const context = await getContext(supabase, siteId)

    if (!context.site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Build prompt
    const systemPrompt = buildSystemPrompt(context)

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content || '{}'

    let response: AIResponse
    try {
      response = JSON.parse(responseText)
    } catch {
      // Fallback response if parsing fails
      response = {
        type: 'metrics',
        title: 'Site Overview',
        data: [
          { label: 'Total Lots', value: context.stats.total, color: '#007AFF' },
          { label: 'Completed', value: context.stats.completed, color: '#34C759' },
          { label: 'Delayed', value: context.stats.delayed, color: '#FF3B30' },
        ],
        total: context.stats.total,
        unit: 'lots',
      }
    }

    return NextResponse.json({
      success: true,
      response,
    })
  } catch (error) {
    console.error('Public AI error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI request failed' },
      { status: 500 }
    )
  }
}
