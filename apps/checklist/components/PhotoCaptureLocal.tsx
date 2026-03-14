'use client'

import { useState, useRef } from 'react'
import { compressImage } from '@/lib/compress'

interface Props {
  itemCode: string
  existingBase64: string | null
  onPhotoCaptured: (base64: string) => void
  onPhotoRemoved: () => void
  disabled?: boolean
}

export default function PhotoCaptureLocal({
  itemCode,
  existingBase64,
  onPhotoCaptured,
  onPhotoRemoved,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        onPhotoCaptured(base64)
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

  if (existingBase64) {
    return (
      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#E5E7EB]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={existingBase64} alt={`Photo ${itemCode}`} className="w-full h-full object-cover" />
        {!disabled && (
          <button
            onClick={onPhotoRemoved}
            className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
          >
            &times;
          </button>
        )}
      </div>
    )
  }

  return (
    <label className={`
      w-20 h-20 rounded-lg border-2 border-dashed border-[#E5E7EB]
      flex flex-col items-center justify-center cursor-pointer
      hover:border-brand-500 transition-colors
      ${processing ? 'opacity-50 pointer-events-none' : ''}
      ${disabled ? 'opacity-30 pointer-events-none' : ''}
    `}>
      {processing ? (
        <span className="text-[10px] text-[#667085]">Processing...</span>
      ) : (
        <>
          <span className="text-lg text-[#9CA3AF]">+</span>
          <span className="text-[10px] text-[#9CA3AF]">Photo</span>
        </>
      )}
      {error && <span className="text-[9px] text-[#DC2626]">{error}</span>}
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
  )
}
