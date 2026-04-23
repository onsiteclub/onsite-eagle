import { NextResponse } from 'next/server'
import { createAdminClient } from '@onsite/supabase'
import { STORAGE_BUCKET } from '@/lib/constants'

export const maxDuration = 30

/**
 * Single photo upload endpoint.
 * Accepts multipart/form-data with one file + metadata.
 * Returns the public URL immediately.
 *
 * This avoids the body-size limit problem of sending
 * all photos as base64 in a single JSON POST.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string | null
    const itemCode = formData.get('itemCode') as string | null

    if (!file || !folder || !itemCode) {
      return NextResponse.json(
        { error: 'Missing file, folder, or itemCode' },
        { status: 400 },
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const timestamp = Date.now()
    const path = `shared-reports/${folder}/${itemCode}_${timestamp}.jpg`

    const supabase = createAdminClient()

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadErr) {
      console.error('Upload failed:', uploadErr.message)
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 },
      )
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
