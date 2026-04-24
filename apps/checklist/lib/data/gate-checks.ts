import { createClient } from '@onsite/supabase/client'
import {
  completeGateCheck as remoteCompleteGateCheck,
  getGateCheck as remoteGetGateCheck,
  getLatestGateCheck as remoteGetLatestGateCheck,
  getTemplateItems,
  startGateCheck as remoteStartGateCheck,
  updateGateCheckItem as remoteUpdateGateCheckItem,
} from '@onsite/framing'
import type {
  FrmGateCheck,
  FrmGateCheckItem,
  GateCheckResult,
  GateCheckTransition,
} from '@onsite/framing'

import { isSQLiteAvailable } from '@/lib/db/client'
import {
  createGateCheck as localCreateGateCheck,
  findGateCheck as localFindGateCheck,
  findLatestGateCheckForLot as localFindLatestGateCheck,
  markGateCheckComplete as localMarkComplete,
  updateItemResult as localUpdateItemResult,
} from '@/lib/db/repositories/gate-checks'
import { createPhoto as localCreatePhoto } from '@/lib/db/repositories/photos'
import {
  findTemplate as localFindTemplate,
  templateAgeMs,
  upsertTemplate,
} from '@/lib/db/repositories/templates'
import { kickSync } from '@/lib/sync/engine'
import { isNativePlatform } from '@/lib/native/platform'
import { savePhotoFromBlob } from '@/lib/native/filesystem'

/**
 * Data-layer API used by the /app/* pages.
 *
 * On native platforms it reads/writes the local SQLite store and lets
 * the sync engine push changes in the background. On web it talks
 * straight to Supabase (no offline support).
 *
 * The page code never branches on platform — it just awaits these
 * functions.
 */

const TEMPLATE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export interface GateCheckItemData {
  id: string
  remoteId: string | null
  itemCode: string
  itemLabel: string
  isBlocking: boolean
  result: GateCheckResult
  notes: string | null
  photoUrl: string | null        // first photo, kept for back-compat + native
  photoUrls: string[]            // canonical list (1 normally, up to 6 for cleanup)
  maxPhotos: number
  minPhotos: number | null
  photoGuidance: string | null
}

export interface GateCheckData {
  id: string
  remoteId: string | null
  lotId: string
  transition: string
  status: 'in_progress' | 'passed' | 'failed'
  items: GateCheckItemData[]
}

// ---------- Public API ----------

export async function fetchGateCheck(id: string): Promise<GateCheckData | null> {
  if (useLocal()) {
    const local = await localFindGateCheck(id)
    return local ? toData(local.gateCheck, local.items) : null
  }

  const supabase = createClient()
  const gc = await remoteGetGateCheck(supabase, id)
  if (!gc) return null
  return toDataFromRemote(gc)
}

export async function fetchLatestGateCheckForLot(
  lotId: string,
  transition: string,
): Promise<GateCheckData | null> {
  if (useLocal()) {
    const local = await localFindLatestGateCheck(lotId, transition)
    return local ? toData(local.gateCheck, local.items) : null
  }

  const supabase = createClient()
  const gc = await remoteGetLatestGateCheck(supabase, lotId, transition as GateCheckTransition)
  if (!gc) return null
  return toDataFromRemote(gc)
}

export interface StartGateCheckInput {
  lotId: string
  lotNumber?: string | null
  lotAddress?: string | null
  jobsiteName?: string | null
  organizationId?: string | null
  transition: string
  userId: string
}

export async function startNewGateCheck(input: StartGateCheckInput): Promise<GateCheckData> {
  if (useLocal()) {
    const templates = await getTemplatesWithCache(input.transition)
    if (!templates.length) {
      throw new Error(`No template items found for transition "${input.transition}"`)
    }

    const { gateCheck, items } = await localCreateGateCheck({
      lotId: input.lotId,
      lotNumber: input.lotNumber ?? null,
      lotAddress: input.lotAddress ?? null,
      jobsiteName: input.jobsiteName ?? null,
      organizationId: input.organizationId ?? null,
      transition: input.transition,
      checkedBy: input.userId,
      items: templates.map((t) => ({
        itemCode: t.itemCode,
        itemLabel: t.itemLabel,
        isBlocking: t.isBlocking,
      })),
    })

    // Fire-and-forget: don't block the user on network.
    void kickSync()

    return toData(gateCheck, items)
  }

  const supabase = createClient()
  const result = await remoteStartGateCheck(
    supabase,
    input.lotId,
    input.transition as never,
    input.userId,
    input.organizationId ?? undefined,
  )
  return toDataFromRemote({ ...result.gateCheck, items: result.items })
}

export interface UpdateItemInput {
  itemId: string
  result: GateCheckResult
  notes?: string | null
  photoUrl?: string | null
}

export async function updateItemResult(input: UpdateItemInput): Promise<void> {
  if (useLocal()) {
    await localUpdateItemResult(input.itemId, {
      result: input.result,
      notes: input.notes ?? undefined,
      photoUrl: input.photoUrl ?? undefined,
    })
    void kickSync()
    return
  }

  const supabase = createClient()
  await remoteUpdateGateCheckItem(
    supabase,
    input.itemId,
    input.result,
    input.photoUrl ?? undefined,
    input.notes ?? undefined,
  )
}

export interface AddItemPhotoInput {
  itemId: string
  gateCheckId: string
  itemCode: string
  /** JPEG blob from camera/compression pipeline. */
  blob: Blob
  /** Optional current item result — defaults to 'fail' when pending. */
  currentResult?: GateCheckResult
  currentNotes?: string | null
}

export interface AddItemPhotoResult {
  /** URL suitable for <img src>; may be file:// on native until sync. */
  displayUrl: string
  /** Canonical list of all photos on this item after the append. */
  photoUrls: string[]
}

/**
 * Persist a photo for an item and wire it to the item's photo_url.
 *
 * Native: blob → filesystem → photos table (queued upload) → update item
 *         with local display URL so the UI shows it immediately.
 * Web:    blob → direct Supabase Storage upload → item.photo_url = public URL.
 */
export async function addItemPhoto(input: AddItemPhotoInput): Promise<AddItemPhotoResult> {
  const result: GateCheckResult = input.currentResult && input.currentResult !== 'pending'
    ? input.currentResult
    : 'fail'

  if (useLocal()) {
    const filename = `${input.itemCode}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
    const saved = await savePhotoFromBlob(input.blob, filename)

    await localCreatePhoto({
      itemId: input.itemId,
      gateCheckId: input.gateCheckId,
      localPath: saved.localPath,
    })

    await localUpdateItemResult(input.itemId, {
      result,
      notes: input.currentNotes ?? undefined,
      photoUrl: saved.displayUrl,
    })

    void kickSync()
    return { displayUrl: saved.displayUrl, photoUrls: [saved.displayUrl] }
  }

  const { STORAGE_BUCKET, STORAGE_PREFIX } = await import('@/lib/constants')
  const supabase = createClient()
  const path = `${STORAGE_PREFIX}/${input.gateCheckId}/${input.itemCode}_${Date.now()}.jpg`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, input.blob, { upsert: true, contentType: 'image/jpeg' })

  if (uploadErr) throw uploadErr

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  const publicUrl = data.publicUrl

  // Read current item to append (respecting max_photos). Items with
  // min_photos > 0 (cleanup) accumulate photos; single-photo items
  // still use the same path — they just cap at max_photos = 1.
  const { data: current } = await supabase
    .from('frm_gate_check_items')
    .select('photo_urls, max_photos')
    .eq('id', input.itemId)
    .single()

  const existing: string[] = Array.isArray(current?.photo_urls) ? current!.photo_urls : []
  const cap = typeof current?.max_photos === 'number' && current.max_photos > 0 ? current.max_photos : 1
  const nextUrls = [...existing, publicUrl].slice(-cap)

  const { error: updErr } = await supabase
    .from('frm_gate_check_items')
    .update({
      result,
      notes: input.currentNotes ?? null,
      photo_url: nextUrls[0] ?? null,
      photo_urls: nextUrls,
    })
    .eq('id', input.itemId)

  if (updErr) throw updErr

  return { displayUrl: publicUrl, photoUrls: nextUrls }
}

export async function removeItemPhoto(
  itemId: string,
  result: GateCheckResult,
  notes: string | null,
  urlToRemove?: string,
): Promise<string[]> {
  if (useLocal()) {
    await localUpdateItemResult(itemId, {
      result,
      notes: notes ?? undefined,
      photoUrl: null,
    })
    void kickSync()
    return []
  }

  const supabase = createClient()

  // Read current urls to remove the specific one (or all if no url given)
  const { data: current } = await supabase
    .from('frm_gate_check_items')
    .select('photo_urls')
    .eq('id', itemId)
    .single()

  const existing: string[] = Array.isArray(current?.photo_urls) ? current!.photo_urls : []
  const nextUrls = urlToRemove ? existing.filter((u) => u !== urlToRemove) : []

  const { error } = await supabase
    .from('frm_gate_check_items')
    .update({
      result,
      notes: notes ?? null,
      photo_url: nextUrls[0] ?? null,
      photo_urls: nextUrls,
    })
    .eq('id', itemId)

  if (error) throw error
  return nextUrls
}

export async function submitGateCheck(localOrRemoteId: string): Promise<void> {
  if (useLocal()) {
    // Decide passed/failed locally so the UI can reflect status before
    // the server sees it. Server re-computes in completeGateCheck() —
    // last write wins.
    const local = await localFindGateCheck(localOrRemoteId)
    if (!local) throw new Error('Gate check not found')

    const templates = await getTemplatesWithCache(local.gateCheck.transition)
    const blockingCodes = new Set(templates.filter((t) => t.isBlocking).map((t) => t.itemCode))

    const hasPending = local.items.some((i) => i.result === 'pending')
    if (hasPending) throw new Error('All items must have a result before submission')

    const failed = local.items.some(
      (i) => i.result === 'fail' && blockingCodes.has(i.item_code),
    )
    const anyFailed = local.items.some((i) => i.result === 'fail')
    const status: 'passed' | 'failed' = failed ? 'failed' : anyFailed ? 'failed' : 'passed'

    await localMarkComplete(localOrRemoteId, status)
    void kickSync()
    return
  }

  const supabase = createClient()
  await remoteCompleteGateCheck(supabase, localOrRemoteId)
}

// ---------- Helpers ----------

function useLocal(): boolean {
  return isNativePlatform() && isSQLiteAvailable()
}

interface TemplateCacheEntry {
  itemCode: string
  itemLabel: string
  sortOrder: number
  isBlocking: boolean
}

async function getTemplatesWithCache(transition: string): Promise<TemplateCacheEntry[]> {
  const cached = await localFindTemplate(transition)
  const age = await templateAgeMs(transition)

  const fresh = cached.length > 0 && age !== null && age < TEMPLATE_TTL_MS
  if (fresh) {
    return cached.map(templateRowToEntry)
  }

  try {
    const supabase = createClient()
    const remote = await getTemplateItems(supabase, transition as never)
    if (remote.length > 0) {
      await upsertTemplate(
        transition,
        remote.map((r) => ({
          itemCode: r.item_code,
          itemLabel: r.item_label,
          sortOrder: r.sort_order,
          isBlocking: r.is_blocking,
        })),
      )
      return remote.map((r) => ({
        itemCode: r.item_code,
        itemLabel: r.item_label,
        sortOrder: r.sort_order,
        isBlocking: r.is_blocking,
      }))
    }
  } catch {
    // offline — fall back to whatever cache we have
  }

  return cached.map(templateRowToEntry)
}

function templateRowToEntry(row: {
  item_code: string
  item_label: string
  sort_order: number
  is_blocking: 0 | 1
}): TemplateCacheEntry {
  return {
    itemCode: row.item_code,
    itemLabel: row.item_label,
    sortOrder: row.sort_order,
    isBlocking: row.is_blocking === 1,
  }
}

function toData(
  gateCheck: {
    id: string
    remote_id: string | null
    lot_id: string
    transition: string
    status: 'in_progress' | 'passed' | 'failed'
  },
  items: Array<{
    id: string
    remote_id: string | null
    item_code: string
    item_label: string
    is_blocking: 0 | 1
    result: GateCheckResult
    notes: string | null
    photo_url: string | null
  }>,
): GateCheckData {
  return {
    id: gateCheck.id,
    remoteId: gateCheck.remote_id,
    lotId: gateCheck.lot_id,
    transition: gateCheck.transition,
    status: gateCheck.status,
    items: items.map((i) => ({
      id: i.id,
      remoteId: i.remote_id,
      itemCode: i.item_code,
      itemLabel: i.item_label,
      isBlocking: i.is_blocking === 1,
      result: i.result,
      notes: i.notes,
      photoUrl: i.photo_url,
      photoUrls: i.photo_url ? [i.photo_url] : [],
      maxPhotos: 1,
      minPhotos: null,
      photoGuidance: null,
    })),
  }
}

/**
 * Public: convert an @onsite/framing remote row into the GateCheckData
 * shape the UI components expect. Useful when server components (SSR
 * routes) fetch data with the framing helpers directly and need to
 * hand it to the shared TransitionCard.
 */
export function toGateCheckData(
  gc: FrmGateCheck & { items: FrmGateCheckItem[] },
): GateCheckData {
  return toDataFromRemote(gc)
}

function toDataFromRemote(
  gc: FrmGateCheck & { items: FrmGateCheckItem[] },
): GateCheckData {
  return {
    id: gc.id,
    remoteId: gc.id,
    lotId: gc.lot_id,
    transition: gc.transition,
    status: gc.status as GateCheckData['status'],
    items: gc.items.map((i) => {
      const photoUrls = Array.isArray(i.photo_urls) && i.photo_urls.length > 0
        ? i.photo_urls
        : i.photo_url ? [i.photo_url] : []
      return {
        id: i.id,
        remoteId: i.id,
        itemCode: i.item_code,
        itemLabel: i.item_label,
        isBlocking: false, // remote item row doesn't carry blocking; templates do
        result: i.result,
        notes: i.notes,
        photoUrl: photoUrls[0] ?? null,
        photoUrls,
        maxPhotos: i.max_photos ?? 1,
        minPhotos: i.min_photos ?? null,
        photoGuidance: i.photo_guidance ?? null,
      }
    }),
  }
}
