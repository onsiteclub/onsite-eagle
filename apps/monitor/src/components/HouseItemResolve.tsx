'use client'

import { useState, useRef } from 'react'
import {
  X, Camera, Loader2, AlertTriangle, CheckCircle2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { resolveHouseItem } from '@onsite/framing'
import type { FrmHouseItem } from '@onsite/framing'

const SEVERITY_COLORS: Record<string, string> = {
  low: '#8E8E93',
  medium: '#FF9500',
  high: '#FF3B30',
  critical: '#AF2E1B',
}

const TYPE_LABELS: Record<string, string> = {
  deficiency: 'Deficiency',
  safety: 'Safety',
  damage: 'Damage',
  missing: 'Missing',
  rework: 'Rework',
  note: 'Note',
}

interface HouseItemResolveProps {
  item: FrmHouseItem
  onResolved: () => void
  onClose: () => void
}

export default function HouseItemResolve({ item, onResolved, onClose }: HouseItemResolveProps) {
  const [resolutionNote, setResolutionNote] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!photoFile) {
      setError('Resolution photo is required as proof')
      return
    }

    setSubmitting(true)

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 2. Upload resolution photo
      const ext = photoFile.name.split('.').pop() || 'jpg'
      const path = `resolved/${item.lot_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('frm-media')
        .upload(path, photoFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('frm-media')
        .getPublicUrl(path)

      // 3. Resolve the item
      await resolveHouseItem(supabase, item.id, user.id, {
        resolved_photo: publicUrl,
        resolution_note: resolutionNote.trim() || undefined,
      })

      onResolved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve item')
    } finally {
      setSubmitting(false)
    }
  }

  const severityColor = SEVERITY_COLORS[item.severity] ?? '#8E8E93'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#34C759]" />
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Resolve Item</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F2F2F7] transition-colors"
          >
            <X className="w-5 h-5 text-[#8E8E93]" />
          </button>
        </div>

        {/* Original item info */}
        <div className="p-5 bg-[#F9F9FB] border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: severityColor }}
            >
              {item.severity}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F2F2F7] text-[#1D1D1F]">
              {TYPE_LABELS[item.type] ?? item.type}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-[#1D1D1F] mb-1">{item.title}</h4>
          {item.description && (
            <p className="text-xs text-[#8E8E93] mb-3">{item.description}</p>
          )}
          {item.photo_url && (
            <img
              src={item.photo_url}
              alt="Original issue"
              className="w-full h-40 object-cover rounded-lg border border-[#E5E5EA]"
            />
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Resolution Note */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
              Resolution Note (optional)
            </label>
            <textarea
              value={resolutionNote}
              onChange={e => setResolutionNote(e.target.value)}
              placeholder="Describe what was done to fix this issue..."
              rows={3}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#34C759] resize-none"
            />
          </div>

          {/* Resolution Photo */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
              Resolution Photo <span className="text-[#FF3B30]">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Resolution preview"
                  className="w-full h-48 object-cover rounded-lg border border-[#D2D2D7]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null)
                    setPhotoPreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-[#D2D2D7] rounded-lg flex flex-col items-center gap-2 hover:border-[#34C759] hover:bg-[#F0FFF5] transition-colors"
              >
                <div className="p-3 bg-[#F2F2F7] rounded-full">
                  <Camera className="w-6 h-6 text-[#8E8E93]" />
                </div>
                <span className="text-sm text-[#8E8E93]">Photo proof of resolution</span>
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-[#FFE5E5] rounded-lg">
              <AlertTriangle className="w-4 h-4 text-[#FF3B30] flex-shrink-0" />
              <span className="text-sm text-[#FF3B30]">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-[#1D1D1F] bg-[#F2F2F7] rounded-lg hover:bg-[#E5E5EA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-[#34C759] rounded-lg hover:bg-[#2DA84C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                'Mark as Resolved'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
