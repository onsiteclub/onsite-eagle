import { NextResponse } from 'next/server'
import { createAdminClient } from '@onsite/supabase'
import { generateToken, generateReference } from '@/lib/tokens'
import { STORAGE_BUCKET } from '@/lib/constants'

export const maxDuration = 60

interface ReportItemPayload {
  code: string
  label: string
  isBlocking: boolean
  result: 'pass' | 'fail' | 'na'
  notes: string
  photos: string[] // base64 data URLs
}

interface ReportPayload {
  info: {
    name: string
    company: string
    jobsite: string
    lotNumber: string
  }
  transition: string
  transitionLabel: string
  items: ReportItemPayload[]
  completedAt: string
  passed: boolean
  startedAt?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReportPayload
    const { info, transition, transitionLabel, items, completedAt, passed, startedAt } = body

    if (!info?.name || !info?.jobsite || !info?.lotNumber || !transition || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const token = generateToken()
    const reference = generateReference()

    // Upload photos to Supabase Storage and collect URLs
    const itemsWithUrls: Array<{
      item_code: string
      item_label: string
      sort_order: number
      is_blocking: boolean
      result: string
      notes: string | null
      photo_urls: string[]
    }> = []

    let totalPhotos = 0

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]
      const photoUrls: string[] = []

      for (let pi = 0; pi < item.photos.length; pi++) {
        const base64 = item.photos[pi]
        if (!base64) continue

        // Strip data URL prefix: "data:image/jpeg;base64,..."
        const match = base64.match(/^data:image\/\w+;base64,(.+)$/)
        if (!match) continue

        const buffer = Buffer.from(match[1], 'base64')
        const path = `shared-reports/${token}/${item.code}_${pi}.jpg`

        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (uploadErr) {
          console.error(`Upload failed for ${path}:`, uploadErr.message)
          continue
        }

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path)

        photoUrls.push(urlData.publicUrl)
        totalPhotos++
      }

      itemsWithUrls.push({
        item_code: item.code,
        item_label: item.label,
        sort_order: idx,
        is_blocking: item.isBlocking,
        result: item.result,
        notes: item.notes || null,
        photo_urls: photoUrls,
      })
    }

    const passCount = items.filter((i) => i.result === 'pass').length
    const failCount = items.filter((i) => i.result === 'fail').length
    const naCount = items.filter((i) => i.result === 'na').length

    // Insert report
    const { data: report, error: reportErr } = await supabase
      .from('frm_shared_reports')
      .insert({
        token,
        reference,
        source: 'self',
        inspector_name: info.name,
        inspector_company: info.company || null,
        jobsite: info.jobsite,
        lot_number: info.lotNumber,
        transition,
        transition_label: transitionLabel,
        passed,
        total_items: items.length,
        pass_count: passCount,
        fail_count: failCount,
        na_count: naCount,
        total_photos: totalPhotos,
        started_at: startedAt || completedAt,
        completed_at: completedAt,
        updated_by: info.name,
      })
      .select('id')
      .single()

    if (reportErr) {
      console.error('Report insert failed:', reportErr)
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
    }

    // Insert items
    const { error: itemsErr } = await supabase
      .from('frm_shared_report_items')
      .insert(itemsWithUrls.map((item) => ({ ...item, report_id: report.id })))

    if (itemsErr) {
      console.error('Items insert failed:', itemsErr)
      return NextResponse.json({ error: 'Failed to save items' }, { status: 500 })
    }

    return NextResponse.json({
      token,
      reference,
      url: `/report/${token}`,
    })
  } catch (err) {
    console.error('Report creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
