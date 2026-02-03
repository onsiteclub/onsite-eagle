import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import type {
  CopilotRequest,
  CopilotResponse,
  CopilotSuggestions,
  PhotoAnalysisResult,
  DocumentExtractionResult,
  FormAssistResult,
  ChecklistItem,
  IssueSuggestion,
} from '@onsite/shared'

// Phase checklists for photo analysis
const PHASE_CHECKLISTS: Record<string, string[]> = {
  'Foundation': [
    'footings poured and cured',
    'foundation walls complete',
    'waterproofing applied',
    'drainage system visible',
    'anchor bolts in place',
  ],
  'First Floor': [
    'floor joists installed and properly spaced',
    'subfloor sheathing installed',
    'blocking between joists',
    'rim board/band joist',
    'beam pockets visible',
  ],
  'First Floor Walls': [
    'wall studs at proper spacing',
    'headers over window openings',
    'headers over door openings',
    'corner framing',
    'double top plate',
  ],
  'Second Floor': [
    'floor joists installed',
    'subfloor sheathing',
    'stairwell opening framed',
    'blocking between joists',
  ],
  'Second Floor Walls': [
    'wall studs properly spaced',
    'headers over openings',
    'corner framing',
    'top plate',
  ],
  'Roof': [
    'roof trusses or rafters installed',
    'ridge board or ridge beam',
    'roof sheathing',
    'fascia board',
    'truss bracing',
  ],
  'Exterior': [
    'house wrap installed',
    'window flashing',
    'door flashing',
    'siding started',
  ],
  'Interior': [
    'insulation installed',
    'drywall hung',
    'electrical rough-in visible',
    'plumbing rough-in visible',
  ],
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({ apiKey })
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Get full context for AI
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

  // Get recent timeline events for this lot
  let recentEvents: { event_type: string; title: string; created_at: string }[] = []
  if (houseId) {
    const { data } = await supabase
      .from('egl_timeline_events')
      .select('event_type, title, created_at')
      .eq('house_id', houseId)
      .order('created_at', { ascending: false })
      .limit(10)
    recentEvents = data || []
  }

  // Calculate site stats
  const stats = {
    total: houses?.length || 0,
    completed: houses?.filter(h => h.status === 'completed').length || 0,
    inProgress: houses?.filter(h => h.status === 'in_progress').length || 0,
    delayed: houses?.filter(h => h.status === 'delayed').length || 0,
    notStarted: houses?.filter(h => h.status === 'not_started').length || 0,
  }

  return { site, house, houses, stats, recentEvents }
}

// Photo Analysis
async function analyzePhoto(
  openai: OpenAI,
  base64Image: string,
  mediaType: string,
  context: Awaited<ReturnType<typeof getContext>>
): Promise<{ suggestions: CopilotSuggestions; extracted: PhotoAnalysisResult; confidence: number; notes: string }> {
  const { site, house } = context

  // Determine which checklist to use based on current phase
  const phaseNames = Object.keys(PHASE_CHECKLISTS)
  const currentPhaseIndex = house?.current_phase || 1
  const phaseName = phaseNames[Math.min(currentPhaseIndex - 1, phaseNames.length - 1)] || 'First Floor'
  const checklist = PHASE_CHECKLISTS[phaseName] || []

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mediaType};base64,${base64Image}` },
          },
          {
            type: 'text',
            text: `You are a construction site AI assistant analyzing a photo.

Context:
- Site: ${site?.name || 'Unknown'}
- Lot: ${house?.lot_number || 'Unknown'}
- Current Phase: ${phaseName} (Phase ${currentPhaseIndex}/7)
- Current Progress: ${house?.progress_percentage || 0}%

Phase Checklist Items:
${checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Analyze this construction photo and return JSON:
{
  "detected_phase": "string (which construction phase this photo shows)",
  "checklist_items": [
    { "name": "item name", "present": boolean, "confidence": 0-1, "notes": "observation" }
  ],
  "issues": [
    { "title": "issue title", "severity": "low|medium|high|critical", "description": "details" }
  ],
  "progress_estimate": number (0-100, estimated progress for this lot based on visible work),
  "timeline_title": "string (short title for timeline entry)",
  "timeline_description": "string (detailed description of what's visible)",
  "quality_score": number (1-10, construction quality visible),
  "safety_concerns": ["any safety issues visible"]
}

Be practical - not everything needs to be visible in one photo. Focus on what IS visible.`,
          },
        ],
      },
    ],
  })

  const textContent = response.choices[0]?.message?.content || '{}'
  const result: PhotoAnalysisResult = JSON.parse(textContent)

  // Convert to copilot suggestions
  const suggestions: CopilotSuggestions = {
    timeline: {
      title: result.timeline_title || 'Photo Upload',
      description: result.timeline_description || 'Construction progress photo',
      event_type: 'photo',
    },
    lot_updates: {
      progress_percentage: result.progress_estimate,
      current_phase: phaseNames.indexOf(result.detected_phase) + 1 || house?.current_phase,
    },
    issues: result.issues?.map(i => ({
      title: i.title,
      description: i.description,
      severity: i.severity as 'low' | 'medium' | 'high' | 'critical',
    })),
  }

  // Calculate confidence based on detected items
  const detectedCount = result.checklist_items?.filter(i => i.present).length || 0
  const totalItems = result.checklist_items?.length || 1
  const confidence = Math.min(0.95, 0.5 + (detectedCount / totalItems) * 0.5)

  return {
    suggestions,
    extracted: result,
    confidence,
    notes: `Detected phase: ${result.detected_phase}. Quality score: ${result.quality_score}/10. ${result.safety_concerns?.length ? `Safety concerns: ${result.safety_concerns.join(', ')}` : 'No safety concerns.'}`,
  }
}

// Document Extraction
async function extractDocument(
  openai: OpenAI,
  base64Content: string,
  mediaType: string,
  context: Awaited<ReturnType<typeof getContext>>
): Promise<{ suggestions: CopilotSuggestions; extracted: DocumentExtractionResult; confidence: number; notes: string }> {
  const { site, house } = context

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mediaType};base64,${base64Content}` },
          },
          {
            type: 'text',
            text: `You are extracting information from a construction document.

Context:
- Site: ${site?.name || 'Unknown'}
- Lot: ${house?.lot_number || 'Unknown'}

This could be an inspection report, permit, contract, invoice, or other construction document.

Extract all relevant information and return JSON:
{
  "document_type": "inspection_report|permit|contract|invoice|other",
  "extracted_fields": {
    "date": "YYYY-MM-DD if found",
    "inspector_name": "name if inspection",
    "permit_number": "number if permit",
    "result": "pass|fail|pending if inspection",
    "amount": "number if invoice",
    "company": "company name if found",
    "notes": "any important notes"
  },
  "timeline_entry": {
    "title": "short descriptive title",
    "description": "summary of document content"
  },
  "suggested_updates": {
    "status": "completed|in_progress|delayed|null",
    "notes": "any notes to add to lot"
  },
  "confidence": 0-1
}

Extract as much useful information as possible. If uncertain about a field, omit it.`,
          },
        ],
      },
    ],
  })

  const textContent = response.choices[0]?.message?.content || '{}'
  const result: DocumentExtractionResult = JSON.parse(textContent)

  // Convert to copilot suggestions
  const suggestions: CopilotSuggestions = {
    timeline: result.timeline_entry ? {
      title: result.timeline_entry.title,
      description: result.timeline_entry.description,
      event_type: result.document_type === 'inspection_report' ? 'inspection' : 'document',
    } : undefined,
    form_fields: result.extracted_fields as Record<string, string | number | boolean | null>,
    lot_updates: result.suggested_updates?.status ? {
      status: result.suggested_updates.status as 'completed' | 'in_progress' | 'delayed',
    } : undefined,
  }

  return {
    suggestions,
    extracted: result,
    confidence: result.confidence || 0.7,
    notes: `Document type: ${result.document_type}. ${Object.keys(result.extracted_fields || {}).length} fields extracted.`,
  }
}

// Form Assist
async function assistForm(
  openai: OpenAI,
  formType: string,
  existingData: Record<string, unknown>,
  context: Awaited<ReturnType<typeof getContext>>
): Promise<{ suggestions: CopilotSuggestions; extracted: FormAssistResult; confidence: number; notes: string }> {
  const { site, house, houses, stats, recentEvents } = context

  // Calculate average progress of similar lots
  const similarLots = houses?.filter(h => h.status === 'in_progress') || []
  const avgProgress = similarLots.length > 0
    ? Math.round(similarLots.reduce((sum, h) => sum + (h.progress_percentage || 0), 0) / similarLots.length)
    : 50

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are helping fill a construction management form. Suggest practical values based on context.`,
      },
      {
        role: 'user',
        content: `Form type: ${formType}

Site Context:
- Site: ${site?.name} (${site?.city})
- Total lots: ${stats.total}
- Completed: ${stats.completed}
- In Progress: ${stats.inProgress}
- Delayed: ${stats.delayed}
- Average progress of active lots: ${avgProgress}%

Lot Context:
- Lot Number: ${house?.lot_number}
- Current Status: ${house?.status}
- Current Phase: ${house?.current_phase}/7
- Progress: ${house?.progress_percentage}%
- Created: ${house?.created_at}

Recent Activity:
${recentEvents.map(e => `- ${e.event_type}: ${e.title}`).join('\n') || 'No recent activity'}

Existing Form Data:
${JSON.stringify(existingData, null, 2)}

For a "${formType}" form, suggest values for empty fields. Return JSON:
{
  "suggestions": {
    "field_name": "suggested value"
  },
  "reasoning": {
    "field_name": "why this value was suggested"
  },
  "confidence": 0-1
}

Field names for schedule form: priority_score (1-100), target_date, closing_date, buyer_name, schedule_notes, is_sold
Field names for issue form: title, description, severity (low/medium/high/critical)
Field names for inspection form: inspector_name, inspection_date, result (pass/fail), notes

Only suggest values that make sense based on context. Don't suggest values for fields that already have data.`,
      },
    ],
  })

  const textContent = response.choices[0]?.message?.content || '{}'
  const result: FormAssistResult = JSON.parse(textContent)

  // Convert to copilot suggestions
  const suggestions: CopilotSuggestions = {
    form_fields: result.suggestions,
  }

  return {
    suggestions,
    extracted: result,
    confidence: result.confidence || 0.7,
    notes: `Suggested ${Object.keys(result.suggestions || {}).length} field values.`,
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json() as CopilotRequest
    const { type, content, context: requestContext } = body

    if (!type || !content || !requestContext?.siteId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, content, context.siteId' },
        { status: 400 }
      )
    }

    const openai = getOpenAIClient()
    const supabase = getSupabaseClient()

    // Get context from database
    const context = await getContext(supabase, requestContext.siteId, requestContext.houseId)

    let result: {
      suggestions: CopilotSuggestions
      extracted: PhotoAnalysisResult | DocumentExtractionResult | FormAssistResult
      confidence: number
      notes: string
    }

    switch (type) {
      case 'photo': {
        // Content is base64 image
        const mediaType = content.startsWith('/9j/') ? 'image/jpeg' : 'image/png'
        result = await analyzePhoto(openai, content, mediaType, context)
        break
      }

      case 'document': {
        // Content is base64 document (PDF converted to image, or image)
        const mediaType = content.startsWith('/9j/') ? 'image/jpeg' : 'image/png'
        result = await extractDocument(openai, content, mediaType, context)
        break
      }

      case 'form_assist': {
        // Content is JSON string with form type and existing data
        const formData = JSON.parse(content)
        result = await assistForm(
          openai,
          requestContext.formType || formData.formType || 'general',
          requestContext.existingData || formData.existingData || {},
          context
        )
        break
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown type: ${type}` },
          { status: 400 }
        )
    }

    const response: CopilotResponse = {
      success: true,
      suggestions: result.suggestions,
      confidence: result.confidence,
      extracted_data: result.extracted,
      ai_notes: result.notes,
      ai_model: type === 'form_assist' ? 'gpt-4o-mini' : 'gpt-4o',
      processing_time_ms: Date.now() - startTime,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('AI Copilot error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI processing failed',
      },
      { status: 500 }
    )
  }
}
