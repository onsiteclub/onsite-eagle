import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    // Determine media type
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
              text: `Analyze this subdivision/site plan image and extract lot information.

Your task:
1. Identify all lots/parcels visible in the plan
2. Extract lot numbers if visible
3. Identify streets and their names
4. Estimate the position of each lot relative to the image

Respond in JSON format:
{
  "lots": [
    {
      "lot_number": "string or null if not visible",
      "position": {
        "x_percent": 0-100,
        "y_percent": 0-100,
        "width_percent": estimated width,
        "height_percent": estimated height
      },
      "confidence": 0-1
    }
  ],
  "streets": [
    {
      "name": "string or null",
      "orientation": "horizontal" | "vertical" | "diagonal"
    }
  ],
  "total_lots_detected": number,
  "plan_type": "subdivision" | "site_plan" | "floor_plan" | "unknown",
  "notes": "any relevant observations"
}

Be thorough - identify every lot you can see, even if the number isn't fully visible. Estimate positions as percentages of the total image dimensions.`
            }
          ],
        }
      ],
    })

    // Extract text content from response
    const textContent = response.choices[0]?.message?.content
    if (!textContent) {
      throw new Error('No text response from AI')
    }

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response')
    }

    const analysis = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      analysis,
      raw_response: textContent
    })

  } catch (error) {
    console.error('Plan analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
