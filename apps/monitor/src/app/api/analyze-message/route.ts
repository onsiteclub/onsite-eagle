import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({ apiKey })
}

// Construction phases for context
const PHASES = [
  { id: 1, name: 'First Floor' },
  { id: 2, name: 'First Floor Walls' },
  { id: 3, name: 'Second Floor' },
  { id: 4, name: 'Second Floor Walls' },
  { id: 5, name: 'Roof' },
  { id: 6, name: 'Stairs Landing' },
  { id: 7, name: 'Backing Frame' },
]

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { message, siteId, houseId, currentPhase, currentProgress } = body

    if (!message || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, siteId' },
        { status: 400 }
      )
    }

    // Current date/time context for AI
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD
    const currentTime = now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false })
    const dayOfWeek = now.toLocaleDateString('en-CA', { weekday: 'long' })
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Get context if lot-level
    let lotContext = ''
    if (houseId) {
      const { data: house } = await supabase
        .from('frm_lots')
        .select('*')
        .eq('id', houseId)
        .single()

      if (house) {
        lotContext = `
Current lot status:
- Lot number: ${house.lot_number}
- Status: ${house.status}
- Current phase: ${house.current_phase || currentPhase}/7 (${PHASES[(house.current_phase || currentPhase) - 1]?.name})
- Progress: ${house.progress_percentage || currentProgress}%
- Is sold: ${house.is_sold ? 'Yes' : 'No'}
${house.closing_date ? `- Closing date: ${house.closing_date}` : ''}
${house.buyer_name ? `- Buyer: ${house.buyer_name}` : ''}
`
      }
    }

    const openai = getOpenAIClient()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant for a construction site management app called Eagle.
Your job is to analyze messages from supervisors/workers and determine:
1. If it contains a question that needs answering
2. If it mentions progress updates that should update the lot
3. If it mentions issues/problems that should be logged
4. If it mentions events/appointments that should be tracked

CURRENT DATE/TIME CONTEXT:
- Today: ${currentDate} (${dayOfWeek})
- Current time: ${currentTime}
- Tomorrow: ${tomorrow}
- Next week: ${nextWeek}

When users mention relative dates, convert them to YYYY-MM-DD format:
- "amanhã" / "tomorrow" → ${tomorrow}
- "hoje" / "today" → ${currentDate}
- "próxima semana" / "next week" → ${nextWeek}

Construction phases (in order): ${PHASES.map(p => `${p.id}. ${p.name}`).join(', ')}

${lotContext}

Respond with JSON:
{
  "should_respond": boolean,
  "response": "string or null - AI response to show in chat",
  "detected_updates": {
    "phase_change": number or null (1-7),
    "progress_change": number or null (0-100),
    "status_change": "not_started|in_progress|delayed|completed|on_hold" or null
  },
  "detected_issues": [
    { "title": "string", "severity": "low|medium|high|critical", "description": "string" }
  ],
  "detected_events": [
    { "title": "string", "date": "YYYY-MM-DD (REQUIRED)", "type": "inspection|delivery|meeting|other", "event_type": "inspection_scheduled|material_delivered|other" }
  ],
  "confidence": number (0-1),
  "reasoning": "brief explanation of what you detected"
}

Rules:
- Only suggest phase changes if the message clearly indicates completion of current phase
- Progress estimates should be reasonable (e.g., "framing done" = ~15%, "roof done" = ~70%)
- Only create issues for actual problems, not routine updates
- Be conservative - when in doubt, don't suggest changes
- If the message is just a greeting or casual chat, set should_respond to false and no updates
- IMPORTANT: For detected_events, ALWAYS provide a date in YYYY-MM-DD format. Use today's date if unclear.`
        },
        {
          role: 'user',
          content: message
        }
      ],
    })

    const textContent = response.choices[0]?.message?.content || '{}'
    const analysis = JSON.parse(textContent)

    return NextResponse.json({
      success: true,
      analysis,
      processing_time_ms: Date.now() - startTime,
    })

  } catch (error) {
    console.error('Message analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
