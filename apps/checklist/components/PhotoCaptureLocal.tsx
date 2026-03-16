'use client'

import { useState, useRef } from 'react'
import { compressImage } from '@/lib/compress'

interface Props {
  itemCode: string
  photos: string[] // array of base64 data URLs
  maxPhotos: number
  onPhotosChanged: (photos: string[]) => void
  disabled?: boolean
}

export default function PhotoCaptureLocal({
  itemCode,
  photos,
  maxPhotos,
  onPhotosChanged,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAdd = photos.length < maxPhotos && !disabled

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessing(true)
    setError(null)

    try {
      const compressed = await compressImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        onPhotosChanged([...photos, base64])
        setProcessing(false)
      }
      reader.onerror = () => {
        setError('Failed to read image')
        setProcessing(false)
      }
      reader.readAsDataURL(compressed)
    } catch {
      setError('Compression failed')
      setProcessing(false)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removePhoto(index: number) {
    const updated = photos.filter((_, i) => i !== index)
    onPhotosChanged(updated)
  }

  return (
    <div className="space-y-1">
      {/* Photo grid — inline row */}
      <div className="flex flex-wrap gap-2">
        {photos.map((base64, index) => (
          <div
            key={index}
            className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#E5E7EB] flex-shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={base64}
              alt={`${itemCode} photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
              >
                &times;
              </button>
            )}
            <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/50 text-white px-1 rounded">
              {index + 1}
            </span>
          </div>
        ))}

        {/* Add photo button */}
        {canAdd && (
          <label
            className={`
              w-16 h-16 rounded-lg border-2 border-dashed border-[#E5E7EB] flex-shrink-0
              flex flex-col items-center justify-center cursor-pointer
              hover:border-[#0F766E] transition-colors
              ${processing ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            {processing ? (
              <span className="text-[9px] text-[#667085]">...</span>
            ) : (
              <>
                <span className="text-lg text-[#9CA3AF] leading-none">+</span>
                <span className="text-[9px] text-[#9CA3AF]">
                  {photos.length}/{maxPhotos}
                </span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              disabled={disabled || processing}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Status text */}
      {photos.length > 0 && photos.length < maxPhotos && (
        <p className="text-[10px] text-[#667085]">
          {photos.length} photo{photos.length > 1 ? 's' : ''} attached — up to {maxPhotos - photos.length} more
        </p>
      )}

      {photos.length === maxPhotos && (
        <p className="text-[10px] text-[#667085]">
          Maximum {maxPhotos} photos reached
        </p>
      )}

      {error && <p className="text-[10px] text-[#DC2626]">{error}</p>}
    </div>
  )
}
