import { NextResponse } from 'next/server'
import { createAdminClient } from '@onsite/supabase'
import { generateToken, generateReference } from '@/lib/tokens'

export const maxDuration = 60

interface ReportItemPayload {
  code: string
  label: string
  isBlocking: boolean
  result: 'pass' | 'fail' | 'na'
  notes: string
  photoUrls?: string[] // pre-uploaded URLs (new flow)
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

    // Reject reports where cleanup item (house_clean) has no photos
    const cleanupItem = items.find((i) => i.code === 'house_clean')
    if (cleanupItem && cleanupItem.result !== 'na' && (!cleanupItem.photoUrls || cleanupItem.photoUrls.length === 0)) {
      return NextResponse.json({ error: 'Cleanup photos are required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const token = generateToken()
    const reference = generateReference()

    // Build items — photos are already uploaded via /api/upload
    const itemsWithUrls = items.map((item, idx) => ({
      item_code: item.code,
      item_label: item.label,
      sort_order: idx,
      is_blocking: item.isBlocking,
      result: item.result,
      notes: item.notes || null,
      photo_urls: item.photoUrls || [],
    }))

    const totalPhotos = itemsWithUrls.reduce((sum, i) => sum + i.photo_urls.length, 0)
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
