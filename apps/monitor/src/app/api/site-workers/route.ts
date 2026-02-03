import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - List workers for a site
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('siteId')

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('egl_site_workers')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('worker_name')

  if (error) {
    console.error('Error fetching site workers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST - Add a worker to a site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      site_id,
      worker_name,
      worker_phone,
      worker_email,
      trade,
      company_name,
    } = body

    if (!site_id || !worker_name) {
      return NextResponse.json(
        { error: 'site_id and worker_name are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('egl_site_workers')
      .insert({
        site_id,
        worker_name,
        worker_phone: worker_phone || null,
        worker_email: worker_email || null,
        trade: trade || null,
        company_name: company_name || null,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Worker already exists in this site' },
          { status: 409 }
        )
      }
      console.error('Error adding site worker:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/site-workers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a worker from a site (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Worker id is required' }, { status: 400 })
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('egl_site_workers')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error removing site worker:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/site-workers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
