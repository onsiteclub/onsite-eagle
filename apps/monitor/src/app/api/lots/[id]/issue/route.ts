import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST - Issue a lot to a worker
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lotId } = await params
    const body = await request.json()
    const { worker_id, worker_name, issued_by_name } = body

    if (!worker_id || !worker_name) {
      return NextResponse.json(
        { error: 'worker_id and worker_name are required' },
        { status: 400 }
      )
    }

    // 1. Get the lot info
    const { data: lot, error: lotError } = await supabase
      .from('frm_lots')
      .select('*, jobsite:frm_jobsites(id, name)')
      .eq('id', lotId)
      .single()

    if (lotError || !lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
    }

    // 2. Check if plans exist for this lot
    const { data: plans } = await supabase
      .from('frm_documents')
      .select('id, name, file_url, file_type')
      .eq('lot_id', lotId)
      .eq('category', 'plan')

    if (!plans || plans.length === 0) {
      return NextResponse.json(
        { error: 'Cannot issue lot without plans. Please upload plans first.' },
        { status: 400 }
      )
    }

    // 3. Update the lot as issued
    const { error: updateError } = await supabase
      .from('frm_lots')
      .update({
        is_issued: true,
        issued_at: new Date().toISOString(),
        issued_to_worker_id: worker_id,
        issued_to_worker_name: worker_name,
        status: lot.status === 'pending' ? 'in_progress' : lot.status,
      })
      .eq('id', lotId)

    if (updateError) {
      console.error('Error updating lot:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 4. Post plans to timeline as first message
    const planAttachments = plans.map(plan => ({
      type: 'document',
      url: plan.file_url,
      name: plan.name,
    }))

    const plansList = plans.map(p => `• ${p.name}`).join('\n')

    await supabase.from('frm_messages').insert({
      jobsite_id: lot.jobsite_id,
      lot_id: lotId,
      sender_type: 'system',
      sender_name: 'Eagle System',
      content: `📐 **Lot Issued to ${worker_name}**\n\nOfficial plans for this lot:\n${plansList}\n\n_These plans are now available to the assigned worker._`,
      attachments: planAttachments,
      is_ai_response: false,
      phase_at_creation: lot.current_phase || 1,
    })

    // 5. Log the issuance event
    await supabase.from('frm_messages').insert({
      jobsite_id: lot.jobsite_id,
      lot_id: lotId,
      sender_type: 'system',
      sender_name: 'Eagle System',
      content: `🔓 **Lot ${lot.lot_number} Issued**\n\nAssigned to: **${worker_name}**\nIssued by: ${issued_by_name || 'Supervisor'}\nDate: ${new Date().toLocaleDateString('en-CA')}\n\n_Timeline is now active. Worker can access this lot._`,
      attachments: [],
      is_ai_response: false,
      phase_at_creation: lot.current_phase || 1,
    })

    // 6. Create a calendar event for the issuance
    await supabase.from('frm_external_events').insert({
      jobsite_id: lot.jobsite_id,
      lot_id: lotId,
      event_type: 'other',
      title: `Lot ${lot.lot_number} issued to ${worker_name}`,
      description: `Lot formally assigned and work can begin`,
      event_date: new Date().toISOString().split('T')[0],
      source: 'system',
    })

    return NextResponse.json({
      success: true,
      message: `Lot ${lot.lot_number} issued to ${worker_name}`,
      lot: {
        id: lotId,
        lot_number: lot.lot_number,
        is_issued: true,
        issued_to_worker_name: worker_name,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/lots/[id]/issue:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Un-issue a lot (remove worker assignment)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lotId } = await params

    // 1. Get lot info
    const { data: lot, error: lotError } = await supabase
      .from('frm_lots')
      .select('*')
      .eq('id', lotId)
      .single()

    if (lotError || !lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
    }

    const previousWorker = lot.issued_to_worker_name

    // 2. Clear issuance
    const { error: updateError } = await supabase
      .from('frm_lots')
      .update({
        is_issued: false,
        issued_at: null,
        issued_to_worker_id: null,
        issued_to_worker_name: null,
      })
      .eq('id', lotId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 3. Log the change
    if (previousWorker) {
      await supabase.from('frm_messages').insert({
        jobsite_id: lot.jobsite_id,
        lot_id: lotId,
        sender_type: 'system',
        sender_name: 'Eagle System',
        content: `🔒 **Worker Assignment Removed**\n\nPrevious worker: ${previousWorker}\nLot is now unassigned.`,
        attachments: [],
        is_ai_response: false,
        phase_at_creation: lot.current_phase || 1,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/lots/[id]/issue:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
