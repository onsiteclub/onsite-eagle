'use client'

import { useState, useRef } from 'react'
import { compressImage } from '@/lib/compress'
import { isNativePlatform } from '@/lib/native/platform'
import { capturePhotoBase64, requestCameraPermissions } from '@/lib/native/camera'

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
  const native = isNativePlatform()

  async function handleWebFile(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function handleNativeCapture() {
    if (processing || !canAdd) return
    setProcessing(true)
    setError(null)

    try {
      const granted = await requestCameraPermissions()
      if (!granted) {
        setError('Camera permission denied')
        return
      }

      const base64 = await capturePhotoBase64({ prefix: itemCode })
      onPhotosChanged([...photos, base64])
    } catch (err) {
      // User cancelled or plugin error
      const message = err instanceof Error ? err.message : 'Capture failed'
      if (!message.toLowerCase().includes('cancel')) {
        setError(message)
      }
    } finally {
      setProcessing(false)
    }
  }

  function removePhoto(index: number) {
    const updated = photos.filter((_, i) => i !== index)
    onPhotosChanged(updated)
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {photos.map((src, index) => (
          <div
            key={index}
            className="relative w-16 h-16 rounded-[10px] overflow-hidden border border-[#D1D0CE] flex-shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${itemCode} photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-[rgba(26,26,26,0.6)] rounded-full flex items-center justify-center text-white text-xs"
              >
                &times;
              </button>
            )}
            <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-[rgba(26,26,26,0.5)] text-white px-1 rounded">
              {index + 1}
            </span>
          </div>
        ))}

        {processing && (
          <div className="w-16 h-16 rounded-[10px] border-2 border-[#C58B1B] bg-[#FFF3D6] flex-shrink-0 flex flex-col items-center justify-center animate-pulse">
            <svg className="w-5 h-5 text-[#C58B1B] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-[8px] text-[#C58B1B] font-semibold mt-0.5">Loading</span>
          </div>
        )}

        {canAdd && !processing && (
          native ? (
            <button
              onClick={handleNativeCapture}
              disabled={disabled}
              className="w-16 h-16 rounded-[10px] border-2 border-dashed border-[#D1D0CE] flex-shrink-0 flex flex-col items-center justify-center cursor-pointer hover:border-[#C58B1B] transition-colors"
            >
              <span className="text-lg text-[#B0AFA9] leading-none">+</span>
              <span className="text-[9px] text-[#B0AFA9]">
                {photos.length}/{maxPhotos}
              </span>
            </button>
          ) : (
            <label className="w-16 h-16 rounded-[10px] border-2 border-dashed border-[#D1D0CE] flex-shrink-0 flex flex-col items-center justify-center cursor-pointer hover:border-[#C58B1B] transition-colors">
              <span className="text-lg text-[#B0AFA9] leading-none">+</span>
              <span className="text-[9px] text-[#B0AFA9]">
                {photos.length}/{maxPhotos}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleWebFile}
                disabled={disabled || processing}
                className="hidden"
              />
            </label>
          )
        )}
      </div>

      {processing && (
        <p className="text-[11px] text-[#C58B1B] font-medium">
          Processing photo...
        </p>
      )}

      {!processing && photos.length > 0 && photos.length < maxPhotos && (
        <p className="text-[10px] text-[#888884]">
          {photos.length} photo{photos.length > 1 ? 's' : ''} attached — up to {maxPhotos - photos.length} more
        </p>
      )}

      {!processing && photos.length === maxPhotos && (
        <p className="text-[10px] text-[#888884]">
          Maximum {maxPhotos} photos reached
        </p>
      )}

      {error && <p className="text-[10px] text-[#DC2626]">{error}</p>}
    </div>
  )
}
