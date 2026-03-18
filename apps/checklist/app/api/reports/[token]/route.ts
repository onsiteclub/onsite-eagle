import { NextResponse } from 'next/server'
import { createAdminClient } from '@onsite/supabase'
import { STORAGE_BUCKET } from '@/lib/constants'

export const maxDuration = 60

interface UpdatePayload {
  updatedBy: string
  items: Array<{
    id: string
    result: 'pass' | 'fail' | 'na'
    notes: string | null
    newPhotos?: string[] // base64 data URLs to add
  }>
}

// GET — fetch report by token
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: report, error } = await supabase
    .from('frm_shared_reports')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // Check expiration
  if (report.expires_at && new Date(report.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Report expired' }, { status: 410 })
  }

  const { data: items } = await supabase
    .from('frm_shared_report_items')
    .select('*')
    .eq('report_id', report.id)
    .order('sort_order', { ascending: true })

  return NextResponse.json({ ...report, items: items || [] })
}

// PATCH — update items (result, notes, photos)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = (await request.json()) as UpdatePayload

    if (!body.updatedBy || !body.items?.length) {
      return NextResponse.json({ error: 'Missing updatedBy or items' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify report exists and get current history
    const { data: report, error: fetchErr } = await supabase
      .from('frm_shared_reports')
      .select('id, token, edit_history')
      .eq('token', token)
      .single()

    if (fetchErr || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Fetch current items for diff
    const { data: currentItems } = await supabase
      .from('frm_shared_report_items')
      .select('id, item_code, item_label, result, notes, photo_urls')
      .eq('report_id', report.id)

    const currentMap = new Map(
      (currentItems || []).map((i) => [i.id, i])
    )

    // Build change log
    const changes: Array<{ item_code: string; item_label: string; field: string; from: string; to: string }> = []

    for (const itemUpdate of body.items) {
      const prev = currentMap.get(itemUpdate.id)
      if (!prev) continue

      if (itemUpdate.result !== prev.result) {
        changes.push({
          item_code: prev.item_code,
          item_label: prev.item_label,
          field: 'result',
          from: prev.result,
          to: itemUpdate.result,
        })
      }
      if ((itemUpdate.notes || '') !== (prev.notes || '')) {
        changes.push({
          item_code: prev.item_code,
          item_label: prev.item_label,
          field: 'notes',
          from: prev.notes || '',
          to: itemUpdate.notes || '',
        })
      }
      if (itemUpdate.newPhotos?.length) {
        changes.push({
          item_code: prev.item_code,
          item_label: prev.item_label,
          field: 'photos',
          from: `${prev.photo_urls?.length || 0} photos`,
          to: `+${itemUpdate.newPhotos.length} added`,
        })
      }
    }

    // Update each item
    for (const itemUpdate of body.items) {
      const updateData: Record<string, unknown> = {
        result: itemUpdate.result,
        notes: itemUpdate.notes,
      }

      // Upload new photos if provided
      if (itemUpdate.newPhotos?.length) {
        // Get existing photo_urls
        const { data: existing } = await supabase
          .from('frm_shared_report_items')
          .select('photo_urls, item_code')
          .eq('id', itemUpdate.id)
          .single()

        const currentUrls = existing?.photo_urls || []
        const newUrls: string[] = []

        for (let pi = 0; pi < itemUpdate.newPhotos.length; pi++) {
          const base64 = itemUpdate.newPhotos[pi]
          const match = base64.match(/^data:image\/\w+;base64,(.+)$/)
          if (!match) continue

          const buffer = Buffer.from(match[1], 'base64')
          const ts = Date.now()
          const code = existing?.item_code || 'item'
          const path = `shared-reports/${token}/${code}_edit_${ts}_${pi}.jpg`

          const { error: uploadErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

          if (!uploadErr) {
            const { data: urlData } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(path)
            newUrls.push(urlData.publicUrl)
          }
        }

        updateData.photo_urls = [...currentUrls, ...newUrls]
      }

      await supabase
        .from('frm_shared_report_items')
        .update(updateData)
        .eq('id', itemUpdate.id)
    }

    // Recalculate pass/fail counts
    const { data: allItems } = await supabase
      .from('frm_shared_report_items')
      .select('result, photo_urls')
      .eq('report_id', report.id)

    const passCount = allItems?.filter((i) => i.result === 'pass').length || 0
    const failCount = allItems?.filter((i) => i.result === 'fail').length || 0
    const naCount = allItems?.filter((i) => i.result === 'na').length || 0
    const totalPhotos = allItems?.reduce((sum, i) => sum + (i.photo_urls?.length || 0), 0) || 0

    // Check if any blocking item failed
    const { data: blockingFails } = await supabase
      .from('frm_shared_report_items')
      .select('id')
      .eq('report_id', report.id)
      .eq('is_blocking', true)
      .eq('result', 'fail')

    const passed = !blockingFails?.length

    // Append to edit history
    const history = Array.isArray(report.edit_history) ? report.edit_history : []
    if (changes.length > 0) {
      history.push({
        name: body.updatedBy,
        at: new Date().toISOString(),
        changes,
      })
    }

    await supabase
      .from('frm_shared_reports')
      .update({
        pass_count: passCount,
        fail_count: failCount,
        na_count: naCount,
        total_photos: totalPhotos,
        passed,
        updated_by: body.updatedBy,
        edit_history: history,
      })
      .eq('id', report.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Report update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
