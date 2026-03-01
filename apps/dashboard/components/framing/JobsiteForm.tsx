'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@onsite/supabase/client'
import { createJobsite, updateJobsite } from '@onsite/framing'
import type { FrmJobsite } from '@onsite/framing'

interface JobsiteFormProps {
  jobsite?: FrmJobsite
  onClose: () => void
  onSaved: () => void
}

export function JobsiteForm({ jobsite, onClose, onSaved }: JobsiteFormProps) {
  const isEditing = !!jobsite

  const [name, setName] = useState(jobsite?.name ?? '')
  const [builderName, setBuilderName] = useState(jobsite?.builder_name ?? '')
  const [city, setCity] = useState(jobsite?.city ?? '')
  const [address, setAddress] = useState(jobsite?.address ?? '')
  const [startDate, setStartDate] = useState(jobsite?.start_date ?? '')
  const [expectedEndDate, setExpectedEndDate] = useState(jobsite?.expected_end_date ?? '')
  const [lumberyardNotes, setLumberyardNotes] = useState(jobsite?.lumberyard_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !builderName.trim() || !city.trim()) {
      setError('Name, builder, and city are required.')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      if (isEditing) {
        await updateJobsite(supabase, jobsite.id, {
          name: name.trim(),
          builder_name: builderName.trim(),
          city: city.trim(),
          address: address.trim() || undefined,
          start_date: startDate || undefined,
          expected_end_date: expectedEndDate || undefined,
          lumberyard_notes: lumberyardNotes.trim() || null,
        })
      } else {
        await createJobsite(supabase, {
          name: name.trim(),
          builder_name: builderName.trim(),
          city: city.trim(),
          address: address.trim() || undefined,
          start_date: startDate || undefined,
          expected_end_date: expectedEndDate || undefined,
          lumberyard_notes: lumberyardNotes.trim() || undefined,
        })
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save jobsite.')
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
            {isEditing ? 'Edit Jobsite' : 'New Jobsite'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#667085]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">
              Site Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. The Ridge Stage 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">
              Builder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={builderName}
              onChange={e => setBuilderName(e.target.value)}
              placeholder="e.g. Caivan / Minto"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Ottawa"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Street address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1">Expected End</label>
              <input
                type="date"
                value={expectedEndDate}
                onChange={e => setExpectedEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1">Lumberyard Notes</label>
            <textarea
              value={lumberyardNotes}
              onChange={e => setLumberyardNotes(e.target.value)}
              placeholder="Notes about lumber supplier, delivery schedule, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
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
              className="px-4 py-2.5 bg-[#0F766E] text-white text-sm font-medium rounded-lg hover:bg-[#0d6d66] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Jobsite' : 'Create Jobsite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
