import { createClient } from '@onsite/supabase/client'
import { STORAGE_BUCKET, STORAGE_PREFIX } from '@/lib/constants'
import { readPhotoAsBlob } from '@/lib/native/filesystem'
import { findPhoto, markPhotoSynced, markPhotoSyncStatus } from '@/lib/db/repositories/photos'
import { findItem, updateItemResult } from '@/lib/db/repositories/gate-checks'

export async function syncPhoto(photoId: string): Promise<void> {
  const photo = await findPhoto(photoId)
  if (!photo) {
    throw new Error(`Photo ${photoId} not found locally`)
  }

  if (photo.remote_url) {
    return // already synced — queue dedup should prevent this
  }

  await markPhotoSyncStatus(photoId, 'syncing')

  try {
    const blob = await readPhotoAsBlob(photo.local_path)

    const timestamp = Date.now()
    const path = `${STORAGE_PREFIX}/${photo.gate_check_id}/${photo.item_id}_${timestamp}.jpg`

    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    const publicUrl = data.publicUrl

    await markPhotoSynced(photoId, publicUrl)

    // Propagate the URL onto the owning item so the item sync will push it.
    const item = await findItem(photo.item_id)
    if (item) {
      await updateItemResult(photo.item_id, {
        photoUrl: publicUrl,
      })
    }
  } catch (err) {
    await markPhotoSyncStatus(photoId, 'error')
    throw err
  }
}
