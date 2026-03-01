'use client'

import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@onsite/supabase/client'
import { createCrew, updateCrew } from '@onsite/framing'
import type { FrmCrew } from '@onsite/framing'

const SPECIALTY_OPTIONS = [
  'framing',
  'roofing',
  'siding',
  'backing',
  'strapping',
  'basement',
  'capping',
]

interface CrewFormProps {
  crew?: FrmCrew | null
  onClose: () => void
  onSaved: () => void
}

export default function CrewForm({ crew, onClose, onSaved }: CrewFormProps) {
  const isEditing = !!crew

  const [name, setName] = useState(crew?.name ?? '')
  const [phone, setPhone] = useState(crew?.phone ?? '')
  const [email, setEmail] = useState(crew?.email ?? '')
  const [specialty, setSpecialty] = useState<string[]>(crew?.specialty ?? [])
  const [wsibNumber, setWsibNumber] = useState(crew?.wsib_number ?? '')
  const [wsibExpires, setWsibExpires] = useState(crew?.wsib_expires ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleSpecialty(s: string) {
    setSpecialty(prev =>
      prev.includes(s) ? prev.filter(v => v !== s) : [...prev, s],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Crew name is required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      if (isEditing && crew) {
        await updateCrew(supabase, crew.id, {
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          specialty,
          wsib_number: wsibNumber.trim() || null,
          wsib_expires: wsibExpires || null,
        })
      } else {
        await createCrew(supabase, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          specialty,
          wsib_number: wsibNumber.trim() || undefined,
          wsib_expires: wsibExpires || undefined,
        })
      }

      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save crew.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#101828]">
            {isEditing ? 'Edit Crew' : 'New Crew'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 text-[#667085] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">
              Crew Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Frama Crew, New York Crew"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] outline-none"
            />
          </div>

          {/* Specialty Tags */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-2">Specialty</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    specialty.includes(s)
                      ? 'bg-[#0F766E] text-white border-[#0F766E]'
                      : 'bg-white text-[#667085] border-gray-300 hover:border-[#0F766E] hover:text-[#0F766E]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(613) 555-0100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="crew@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] outline-none"
              />
            </div>
          </div>

          {/* WSIB */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1">WSIB Number</label>
              <input
                type="text"
                value={wsibNumber}
                onChange={e => setWsibNumber(e.target.value)}
                placeholder="1234567"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1">WSIB Expires</label>
              <input
                type="date"
                value={wsibExpires}
                onChange={e => setWsibExpires(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#667085] hover:text-[#101828] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#0F766E] text-white rounded-lg hover:bg-[#0D6B63] transition-colors text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Crew'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
