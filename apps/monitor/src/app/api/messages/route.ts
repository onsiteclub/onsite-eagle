import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('siteId')
  const houseId = searchParams.get('houseId')

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
  }

  let query = supabase
    .from('frm_messages')
    .select('*')
    .eq('jobsite_id', siteId)
    .order('created_at', { ascending: true })

  if (houseId) {
    query = query.eq('lot_id', houseId)
  } else {
    query = query.is('lot_id', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobsite_id, lot_id, sender_type, sender_id, sender_name, content, attachments, is_ai_response, ai_question, phase_at_creation } = body

    // Require jobsite_id and sender_name. Content can be empty if there are attachments.
    const hasAttachments = attachments && attachments.length > 0
    if (!jobsite_id || !sender_name) {
      return NextResponse.json(
        { error: 'Missing required fields: jobsite_id, sender_name' },
        { status: 400 }
      )
    }

    if (!content && !hasAttachments) {
      return NextResponse.json(
        { error: 'Message must have content or attachments' },
        { status: 400 }
      )
    }

    // If only attachments, use placeholder content
    const messageContent = content || (hasAttachments ? '📎 Attachment' : '')

    const { data, error } = await supabase
      .from('frm_messages')
      .insert({
        jobsite_id,
        lot_id: lot_id || null,
        sender_type: sender_type || 'supervisor',
        sender_id: sender_id || null,
        sender_name,
        content: messageContent,
        attachments: attachments || [],
        is_ai_response: is_ai_response || false,
        ai_question: ai_question || null,
        phase_at_creation: phase_at_creation || 1,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting message:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/messages:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
