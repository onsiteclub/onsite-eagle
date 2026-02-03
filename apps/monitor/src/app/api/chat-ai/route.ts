import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Initialize clients
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

// Get context for AI
async function getContext(supabase: ReturnType<typeof getSupabaseClient>, siteId: string, houseId?: string) {
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

  // Get specific house if provided
  let house = null
  if (houseId) {
    const { data } = await supabase
      .from('egl_houses')
      .select('*')
      .eq('id', houseId)
      .single()
    house = data
  }

  // Get recent messages (last 20)
  let messagesQuery = supabase
    .from('egl_messages')
    .select('sender_type, sender_name, content, created_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (houseId) {
    messagesQuery = messagesQuery.eq('house_id', houseId)
  } else {
    messagesQuery = messagesQuery.is('house_id', null)
  }

  const { data: messages } = await messagesQuery

  // Calculate stats
  const stats = {
    total: houses?.length || 0,
    completed: houses?.filter(h => h.status === 'completed').length || 0,
    inProgress: houses?.filter(h => h.status === 'in_progress').length || 0,
    delayed: houses?.filter(h => h.status === 'delayed').length || 0,
    notStarted: houses?.filter(h => h.status === 'not_started').length || 0,
    onHold: houses?.filter(h => h.status === 'on_hold').length || 0,
  }

  // Progress percentage
  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return {
    site,
    house,
    houses,
    stats,
    progressPct,
    recentMessages: messages?.reverse() || [],
  }
}

// Build system prompt
function buildSystemPrompt(context: Awaited<ReturnType<typeof getContext>>, houseId?: string) {
  const { site, house, stats, progressPct, recentMessages } = context

  let prompt = `You are Eagle AI, an intelligent assistant for construction site management. You help supervisors understand project status, identify issues, and make decisions.

## Current Context

### Site Information
- **Name:** ${site?.name || 'Unknown'}
- **City:** ${site?.city || 'Unknown'}
- **Total Lots:** ${stats.total}
- **Progress:** ${progressPct}% complete (${stats.completed}/${stats.total} lots)
- **Start Date:** ${site?.start_date || 'Not set'}
- **Expected End:** ${site?.expected_end_date || 'Not set'}

### Status Breakdown
- Completed: ${stats.completed}
- In Progress: ${stats.inProgress}
- Delayed: ${stats.delayed}
- Not Started: ${stats.notStarted}
- On Hold: ${stats.onHold}
`

  if (house) {
    prompt += `
### Current Lot (${house.lot_number})
- **Status:** ${house.status}
- **Phase:** ${house.current_phase}/7
- **Progress:** ${house.progress_percentage}%
- **Address:** ${house.address || 'Not set'}
`
  }

  if (recentMessages.length > 0) {
    prompt += `
### Recent Chat History
${recentMessages.map(m => `- [${m.sender_type}] ${m.sender_name}: ${m.content}`).join('\n')}
`
  }

  prompt += `
## Instructions
- Be concise and actionable
- Reference specific data when answering
- If asked about delays, analyze the numbers and suggest causes
- If asked about progress, compare to expected timeline
- Speak in a professional but friendly tone
- If you don't have enough data, say so honestly
- Format responses clearly with bullet points when appropriate
`

  return prompt
}

export async function POST(request: NextRequest) {
  try {
    const { question, siteId, houseId } = await request.json()

    if (!question || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get context
    const context = await getContext(supabase, siteId, houseId)

    // Build prompt
    const systemPrompt = buildSystemPrompt(context, houseId)

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const answer = completion.choices[0]?.message?.content || 'I was unable to generate a response.'

    return NextResponse.json({
      answer,
      context: {
        siteId,
        houseId,
        stats: context.stats,
      },
    })
  } catch (error) {
    console.error('Chat AI error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI request failed' },
      { status: 500 }
    )
  }
}
