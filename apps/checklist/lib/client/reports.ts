import { createClient } from '@onsite/supabase/client'
import { generateToken, generateReference } from '@/lib/tokens'
import { uploadSharedReportPhoto } from './upload'
import { STORAGE_BUCKET } from '@/lib/constants'

export interface ReportItemPayload {
  code: string
  label: string
  isBlocking: boolean
  result: 'pass' | 'fail' | 'na'
  notes: string
  photoUrls?: string[]
}

export interface ReportPayload {
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

export interface CreateReportResult {
  token: string
  reference: string
  url: string
}

export async function createSharedReport(
  payload: ReportPayload,
): Promise<CreateReportResult> {
  const supabase = createClient()

  const cleanupItem = payload.items.find((i) => i.code === 'house_clean')
  if (
    cleanupItem &&
    cleanupItem.result !== 'na' &&
    (!cleanupItem.photoUrls || cleanupItem.photoUrls.length === 0)
  ) {
    throw new Error('Cleanup photos are required')
  }

  const token = generateToken()
  const reference = generateReference()

  const itemsWithUrls = payload.items.map((item, idx) => ({
    item_code: item.code,
    item_label: item.label,
    sort_order: idx,
    is_blocking: item.isBlocking,
    result: item.result,
    notes: item.notes || null,
    photo_urls: item.photoUrls || [],
  }))

  const totalPhotos = itemsWithUrls.reduce((sum, i) => sum + i.photo_urls.length, 0)
  const passCount = payload.items.filter((i) => i.result === 'pass').length
  const failCount = payload.items.filter((i) => i.result === 'fail').length
  const naCount = payload.items.filter((i) => i.result === 'na').length

  const { data: report, error: reportErr } = await supabase
    .from('frm_shared_reports')
    .insert({
      token,
      reference,
      source: 'self',
      inspector_name: payload.info.name,
      inspector_company: payload.info.company || null,
      jobsite: payload.info.jobsite,
      lot_number: payload.info.lotNumber,
      transition: payload.transition,
      transition_label: payload.transitionLabel,
      passed: payload.passed,
      total_items: payload.items.length,
      pass_count: passCount,
      fail_count: failCount,
      na_count: naCount,
      total_photos: totalPhotos,
      started_at: payload.startedAt || payload.completedAt,
      completed_at: payload.completedAt,
      updated_by: payload.info.name,
    })
    .select('id')
    .single()

  if (reportErr || !report) {
    throw new Error(reportErr?.message || 'Failed to save report')
  }

  const { error: itemsErr } = await supabase
    .from('frm_shared_report_items')
    .insert(itemsWithUrls.map((item) => ({ ...item, report_id: report.id })))

  if (itemsErr) {
    throw new Error(itemsErr.message || 'Failed to save items')
  }

  return {
    token,
    reference,
    url: `/report?token=${token}`,
  }
}

export interface UpdateReportItem {
  id: string
  result: 'pass' | 'fail' | 'na'
  notes: string | null
  newPhotos?: string[]
}

export async function updateSharedReport(
  token: string,
  updatedBy: string,
  items: UpdateReportItem[],
): Promise<void> {
  const supabase = createClient()

  const { data: report, error: fetchErr } = await supabase
    .from('frm_shared_reports')
    .select('id, token, edit_history')
    .eq('token', token)
    .single()

  if (fetchErr || !report) {
    throw new Error('Report not found')
  }

  const { data: currentItems } = await supabase
    .from('frm_shared_report_items')
    .select('id, item_code, item_label, result, notes, photo_urls')
    .eq('report_id', report.id)

  const currentMap = new Map((currentItems || []).map((i) => [i.id, i]))

  const changes: Array<{
    item_code: string
    item_label: string
    field: string
    from: string
    to: string
  }> = []

  for (const itemUpdate of items) {
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

  for (const itemUpdate of items) {
    const updateData: Record<string, unknown> = {
      result: itemUpdate.result,
      notes: itemUpdate.notes,
    }

    if (itemUpdate.newPhotos?.length) {
      const existing = currentMap.get(itemUpdate.id)
      const currentUrls = existing?.photo_urls || []
      const newUrls: string[] = []

      for (let pi = 0; pi < itemUpdate.newPhotos.length; pi++) {
        const base64 = itemUpdate.newPhotos[pi]
        const code = existing?.item_code || 'item'
        const url = await uploadSharedReportPhoto(
          base64,
          token,
          `${code}_edit_${pi}`,
        )
        if (url) newUrls.push(url)
      }

      updateData.photo_urls = [...currentUrls, ...newUrls]
    }

    await supabase
      .from('frm_shared_report_items')
      .update(updateData)
      .eq('id', itemUpdate.id)
  }

  const { data: allItems } = await supabase
    .from('frm_shared_report_items')
    .select('result, photo_urls')
    .eq('report_id', report.id)

  const passCount = allItems?.filter((i) => i.result === 'pass').length || 0
  const failCount = allItems?.filter((i) => i.result === 'fail').length || 0
  const naCount = allItems?.filter((i) => i.result === 'na').length || 0
  const totalPhotos =
    allItems?.reduce((sum, i) => sum + (i.photo_urls?.length || 0), 0) || 0

  const { data: blockingFails } = await supabase
    .from('frm_shared_report_items')
    .select('id')
    .eq('report_id', report.id)
    .eq('is_blocking', true)
    .eq('result', 'fail')

  const passed = !blockingFails?.length

  const history = Array.isArray(report.edit_history) ? report.edit_history : []
  if (changes.length > 0) {
    history.push({
      name: updatedBy,
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
      updated_by: updatedBy,
      edit_history: history,
    })
    .eq('id', report.id)
}

// Re-export constants used by callers
export { STORAGE_BUCKET }
