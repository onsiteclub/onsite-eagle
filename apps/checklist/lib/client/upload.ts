import { createClient } from '@onsite/supabase/client'
import { STORAGE_BUCKET } from '@/lib/constants'

/**
 * Upload a base64 data URL photo to Supabase Storage.
 * Returns the public URL, or null on failure.
 *
 * Replaces the previous POST /api/upload endpoint so the app
 * works under Next.js `output: 'export'` (no server routes).
 */
export async function uploadSharedReportPhoto(
  base64: string,
  folder: string,
  itemCode: string,
): Promise<string | null> {
  const match = base64.match(/^data:image\/\w+;base64,(.+)$/)
  if (!match) return null

  const binary = atob(match[1])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'image/jpeg' })

  const timestamp = Date.now()
  const path = `shared-reports/${folder}/${itemCode}_${timestamp}.jpg`

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

  if (error) {
    console.error('Storage upload failed:', error.message)
    return null
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
