'use client'

import { useState, useRef } from 'react'
import { compressImage } from '@/lib/compress'
import { isNativePlatform, convertFileSrc } from '@/lib/native/platform'
import { capturePhotoBase64, requestCameraPermissions } from '@/lib/native/camera'
import { addItemPhoto } from '@/lib/data/gate-checks'
import type { GateCheckResult } from '@onsite/framing'

interface Props {
  itemId: string
  gateCheckId: string
  itemCode: string
  existingUrl: string | null
  currentResult: GateCheckResult
  currentNotes: string | null
  onPhotoUploaded: (url: string) => void
  onPhotoRemoved: () => void
  disabled?: boolean
}

export default function PhotoCapture({
  itemId,
  gateCheckId,
  itemCode,
  existingUrl,
  currentResult,
  currentNotes,
  onPhotoUploaded,
  onPhotoRemoved,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const native = isNativePlatform()
  const rawUrl = localUrl ?? existingUrl
  const displayUrl = rawUrl ? convertFileSrc(rawUrl) : null

  async function saveBlob(blob: Blob) {
    const result = await addItemPhoto({
      itemId,
      gateCheckId,
      itemCode,
      blob,
      currentResult,
      currentNotes,
    })
    setLocalUrl(result.displayUrl)
    onPhotoUploaded(result.displayUrl)
  }

  async function handleWebFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSaving(true)
    setError(null)

    try {
      const compressed = await compressImage(file)
      await saveBlob(compressed)
    } catch (err) {
      console.error('Save failed:', err)
      setError('Failed to save photo')
    } finally {
      setSaving(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleNativeCapture() {
    if (saving) return
    setSaving(true)
    setError(null)

    try {
      const granted = await requestCameraPermissions()
      if (!granted) {
        setError('Camera permission denied')
        return
      }

      const dataUrl = await capturePhotoBase64({ prefix: itemCode })
      const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/)
      if (!match) throw new Error('Invalid photo data')

      const binary = atob(match[1])
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'image/jpeg' })

      await saveBlob(blob)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      if (!message.toLowerCase().includes('cancel')) {
        console.error('Save failed:', err)
        setError('Failed to save photo')
      }
    } finally {
      setSaving(false)
    }
  }

  function handleRemove() {
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

  const placeholder = (
    <>
      {saving ? (
        <span className="text-[10px] text-[#888884]">Saving...</span>
      ) : (
        <>
          <span className="text-lg text-[#B0AFA9]">+</span>
          <span className="text-[10px] text-[#B0AFA9]">Photo</span>
        </>
      )}
      {error && <span className="text-[9px] text-[#DC2626]">{error}</span>}
    </>
  )

  const baseClass = `
    w-20 h-20 rounded-[10px] border-2 border-dashed border-[#D1D0CE]
    flex flex-col items-center justify-center cursor-pointer
    hover:border-brand-500 transition-colors
    ${saving ? 'opacity-50 pointer-events-none' : ''}
    ${disabled ? 'opacity-30 pointer-events-none' : ''}
  `

  if (native) {
    return (
      <button
        onClick={handleNativeCapture}
        disabled={disabled || saving}
        className={baseClass}
      >
        {placeholder}
      </button>
    )
  }

  return (
    <label className={baseClass}>
      {placeholder}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleWebFile}
        disabled={disabled || saving}
        className="hidden"
      />
    </label>
  )
}
