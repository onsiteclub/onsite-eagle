import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const houseId = searchParams.get('houseId')

  if (!houseId) {
    return NextResponse.json({ error: 'houseId is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('egl_schedules')
    .select('*')
    .eq('house_id', houseId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching schedule:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      house_id,
      template_name,
      expected_start_date,
      expected_end_date,
      actual_start_date,
      status,
      assigned_worker_name,
    } = body

    if (!house_id || !expected_start_date || !expected_end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: house_id, expected_start_date, expected_end_date' },
        { status: 400 }
      )
    }

    // Try to insert
    const { data, error } = await supabase
      .from('egl_schedules')
      .insert({
        house_id,
        template_name: template_name || 'Standard Wood Frame',
        expected_start_date,
        expected_end_date,
        actual_start_date,
        status: status || 'in_progress',
        assigned_worker_name,
      })
      .select()
      .single()

    if (error) {
      // If duplicate, update instead
      if (error.code === '23505') {
        const { data: updateData, error: updateError } = await supabase
          .from('egl_schedules')
          .update({
            actual_start_date,
            status: status || 'in_progress',
            assigned_worker_name,
            updated_at: new Date().toISOString(),
          })
          .eq('house_id', house_id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating schedule:', updateError)
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json(updateData)
      }

      console.error('Error inserting schedule:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/schedules:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
