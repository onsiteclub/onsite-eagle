'use client'

import { useState, useRef } from 'react'
import { createClient } from '@onsite/supabase/client'
import { compressImage } from '@/lib/compress'
import { STORAGE_BUCKET, STORAGE_PREFIX } from '@/lib/constants'

interface Props {
  gateCheckId: string
  itemCode: string
  existingUrl: string | null
  onPhotoUploaded: (url: string) => void
  onPhotoRemoved: () => void
  disabled?: boolean
}

export default function PhotoCapture({
  gateCheckId,
  itemCode,
  existingUrl,
  onPhotoUploaded,
  onPhotoRemoved,
  disabled,
}: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const displayUrl = localUrl ?? existingUrl

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const compressed = await compressImage(file)
      const timestamp = Date.now()
      const path = `${STORAGE_PREFIX}/${gateCheckId}/${itemCode}_${timestamp}.jpg`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path)

      setLocalUrl(data.publicUrl)
      onPhotoUploaded(data.publicUrl)
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    setLocalUrl(null)
    onPhotoRemoved()
  }

  if (displayUrl) {
    return (
      <div className="relative w-20 h-20 rounded-[10px] overflow-hidden border border-[#D1D0CE]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={displayUrl} alt="Photo" className="w-full h-full object-cover" />
        {!disabled && (
          <button
            onClick={handleRemove}
            className="absolute top-0.5 right-0.5 w-5 h-5 bg-[rgba(26,26,26,0.6)] rounded-full flex items-center justify-center text-white text-xs"
          >
            &times;
          </button>
        )}
      </div>
    )
  }

  return (
    <label className={`
      w-20 h-20 rounded-[10px] border-2 border-dashed border-[#D1D0CE]
      flex flex-col items-center justify-center cursor-pointer
      hover:border-brand-500 transition-colors
      ${uploading ? 'opacity-50 pointer-events-none' : ''}
      ${disabled ? 'opacity-30 pointer-events-none' : ''}
    `}>
      {uploading ? (
        <span className="text-[10px] text-[#888884]">Uploading...</span>
      ) : (
        <>
          <span className="text-lg text-[#B0AFA9]">+</span>
          <span className="text-[10px] text-[#B0AFA9]">Photo</span>
        </>
      )}
      {error && <span className="text-[9px] text-[#DC2626]">{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        disabled={disabled || uploading}
        className="hidden"
      />
    </label>
  )
}
