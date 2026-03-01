'use client'

import { useState, useRef } from 'react'
import {
  X, Upload, Camera, Loader2, AlertTriangle, ShieldAlert
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  createHouseItem,
  findCrewForLotPhase,
  FRAMING_PHASES,
} from '@onsite/framing'
import type {
  PhaseId, ItemType, ItemSeverity,
} from '@onsite/framing'

interface HouseItemFormProps {
  lotId: string
  phaseId?: PhaseId
  onCreated: () => void
  onClose: () => void
}

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'deficiency', label: 'Deficiency' },
  { value: 'safety', label: 'Safety' },
  { value: 'damage', label: 'Damage' },
  { value: 'missing', label: 'Missing' },
  { value: 'rework', label: 'Rework' },
  { value: 'note', label: 'Note' },
]

const SEVERITY_LEVELS: { value: ItemSeverity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#8E8E93' },
  { value: 'medium', label: 'Medium', color: '#FF9500' },
  { value: 'high', label: 'High', color: '#FF3B30' },
  { value: 'critical', label: 'Critical', color: '#AF2E1B' },
]

export default function HouseItemForm({ lotId, phaseId, onCreated, onClose }: HouseItemFormProps) {
  const [type, setType] = useState<ItemType>('deficiency')
  const [severity, setSeverity] = useState<ItemSeverity>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPhase, setSelectedPhase] = useState<PhaseId | ''>(phaseId ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSafety = type === 'safety'

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

    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!photoFile) {
      setError('Photo is required')
      return
    }

    setSubmitting(true)

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 2. Upload photo
      const ext = photoFile.name.split('.').pop() || 'jpg'
      const path = `items/${lotId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('frm-media')
        .upload(path, photoFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('frm-media')
        .getPublicUrl(path)

      // 3. Auto-lookup crew if phase is set
      let crewId: string | null = null
      if (selectedPhase) {
        try {
          crewId = await findCrewForLotPhase(supabase, lotId, selectedPhase as PhaseId)
        } catch {
          // crew lookup optional — proceed without
        }
      }

      // 4. Create item
      await createHouseItem(
        supabase,
        {
          lot_id: lotId,
          phase_id: selectedPhase ? (selectedPhase as PhaseId) : null,
          type,
          severity,
          title: title.trim(),
          description: description.trim() || undefined,
          photo_url: publicUrl,
          blocking: isSafety ? true : undefined,
        },
        user.id,
        crewId,
      )

      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5EA]">
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Report Item</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F2F2F7] transition-colors"
          >
            <X className="w-5 h-5 text-[#8E8E93]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Safety callout */}
          {isSafety && (
            <div className="flex items-center gap-2 p-3 bg-[#FFE5E5] rounded-lg">
              <ShieldAlert className="w-4 h-4 text-[#FF3B30] flex-shrink-0" />
              <span className="text-sm text-[#FF3B30] font-medium">
                Safety items are automatically marked as blocking
              </span>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ItemType)}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white"
            >
              {ITEM_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Severity</label>
            <div className="flex gap-2">
              {SEVERITY_LEVELS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                    severity === s.value
                      ? 'text-white border-transparent'
                      : 'text-[#1D1D1F] border-[#D2D2D7] bg-white hover:bg-[#F2F2F7]'
                  }`}
                  style={severity === s.value ? { backgroundColor: s.color, borderColor: s.color } : undefined}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Missing blocking at window header"
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed description of the issue..."
              rows={3}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
            />
          </div>

          {/* Phase */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Phase</label>
            <select
              value={selectedPhase}
              onChange={e => setSelectedPhase(e.target.value as PhaseId | '')}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white"
            >
              <option value="">No phase selected</option>
              {FRAMING_PHASES.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
              Photo <span className="text-[#FF3B30]">*</span>
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
                  alt="Preview"
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
                className="w-full py-8 border-2 border-dashed border-[#D2D2D7] rounded-lg flex flex-col items-center gap-2 hover:border-[#007AFF] hover:bg-[#F0F7FF] transition-colors"
              >
                <div className="p-3 bg-[#F2F2F7] rounded-full">
                  <Camera className="w-6 h-6 text-[#8E8E93]" />
                </div>
                <span className="text-sm text-[#8E8E93]">Click to capture or upload photo</span>
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
              className="flex-1 py-2.5 text-sm font-medium text-white bg-[#007AFF] rounded-lg hover:bg-[#0056CC] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Report Item'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
