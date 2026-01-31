import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({ apiKey })
}

// Checklist items per phase
const PHASE_CHECKLISTS: Record<string, string[]> = {
  'First Floor': [
    'floor joists installed and properly spaced',
    'subfloor sheathing installed',
    'blocking between joists',
    'rim board/band joist',
    'beam pockets visible',
    'proper joist hangers',
    'no visible damage or defects'
  ],
  'First Floor Walls': [
    'wall studs at proper spacing (16" or 24" OC)',
    'headers over window openings',
    'headers over door openings',
    'corner framing (3-stud or California corner)',
    'double top plate',
    'bottom plate secured',
    'window rough openings',
    'door rough openings',
    'cripple studs',
    'king studs and jack studs'
  ],
  'Second Floor': [
    'floor joists installed',
    'subfloor sheathing',
    'stairwell opening framed',
    'blocking between joists',
    'proper bearing on walls below'
  ],
  'Second Floor Walls': [
    'wall studs properly spaced',
    'headers over openings',
    'corner framing',
    'top plate',
    'connection to ceiling joists',
    'gable end framing if visible'
  ],
  'Roof': [
    'roof trusses or rafters installed',
    'ridge board or ridge beam',
    'roof sheathing',
    'fascia board',
    'soffit framing',
    'gable end framing',
    'truss bracing',
    'proper truss spacing'
  ],
  'Stairs Landing': [
    'stair stringers',
    'landing framing',
    'header at top of stairs',
    'proper rise and run visible',
    'handrail blocking',
    'guard rail framing'
  ],
  'Backing Frame': [
    'bathroom blocking for fixtures',
    'kitchen cabinet blocking',
    'handrail blocking',
    'TV mount blocking',
    'grab bar blocking',
    'medicine cabinet blocking',
    'towel bar blocking'
  ]
}

export async function POST(request: NextRequest) {
  try {
    const openai = getOpenAIClient()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const phase = formData.get('phase') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!phase) {
      return NextResponse.json({ error: 'No phase specified' }, { status: 400 })
    }

    const checklist = PHASE_CHECKLISTS[phase] || []

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    const mediaType = file.type

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mediaType};base64,${base64}`,
              },
            },
            {
              type: 'text',
              text: `You are a construction inspector AI for wood frame residential construction.

Analyze this photo for the "${phase}" phase of construction.

Check for these items:
${checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Respond in JSON format:
{
  "approved": boolean,
  "confidence": 0-1,
  "phase_match": boolean (does this photo match the expected phase?),
  "detected_items": [
    {
      "name": "item name",
      "present": boolean,
      "confidence": 0-1,
      "notes": "any observations"
    }
  ],
  "missing_critical_items": ["list of critical items not visible"],
  "quality_issues": ["photo too dark", "wrong angle", etc.],
  "safety_concerns": ["any visible safety issues"],
  "recommendation": "approve" | "request_new_photo" | "needs_supervisor_review",
  "feedback_for_worker": "Clear instruction if new photo needed",
  "overall_notes": "General observations about the construction quality"
}

Be thorough but practical. A photo doesn't need to show everything - just what's reasonably visible from that angle. Mark items as "not_applicable" if they wouldn't be visible in this type of photo.

Critical items that MUST be visible for approval: structural elements like joists, studs, headers.
Non-critical items: can be missing if other photos might capture them.`
            }
          ],
        }
      ],
    })

    const textContent = response.choices[0]?.message?.content
    if (!textContent) {
      throw new Error('No text response from AI')
    }

    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response')
    }

    const validation = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      phase,
      validation,
      checklist_used: checklist,
      raw_response: textContent
    })

  } catch (error) {
    console.error('Photo validation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 }
    )
  }
}
