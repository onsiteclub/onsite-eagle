'use client'

import { useState } from 'react'
import {
  X, ShieldAlert, AlertTriangle, Bell, Loader2, Users, Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createWarning } from '@onsite/framing'
import type { WarningCategory, WarningPriority, WarningTargetType } from '@onsite/framing'

interface WarningComposerProps {
  lotId?: string
  jobsiteId: string
  onClose: () => void
  onCreated: () => void
}

const CATEGORIES: { value: WarningCategory; label: string; icon: typeof ShieldAlert; color: string; bg: string; activeBg: string }[] = [
  { value: 'safety', label: 'Safety', icon: ShieldAlert, color: '#FF3B30', bg: '#FFF5F5', activeBg: '#FF3B30' },
  { value: 'compliance', label: 'Compliance', icon: AlertTriangle, color: '#FF9500', bg: '#FFFBEB', activeBg: '#FF9500' },
  { value: 'operational', label: 'Operational', icon: Bell, color: '#007AFF', bg: '#EFF6FF', activeBg: '#007AFF' },
]

const PRIORITIES: { value: WarningPriority; label: string; color: string; activeBg: string }[] = [
  { value: 'critical', label: 'Critical', color: '#FF3B30', activeBg: '#FF3B30' },
  { value: 'warning', label: 'Warning', color: '#FF9500', activeBg: '#FF9500' },
  { value: 'info', label: 'Info', color: '#007AFF', activeBg: '#007AFF' },
]

const TARGET_TYPES: { value: WarningTargetType; label: string; icon: typeof Users }[] = [
  { value: 'all', label: 'All', icon: Users },
  { value: 'worker', label: 'Worker', icon: Users },
  { value: 'crew', label: 'Crew', icon: Users },
  { value: 'jobsite', label: 'Jobsite', icon: Users },
]

export default function WarningComposer({ lotId, jobsiteId, onClose, onCreated }: WarningComposerProps) {
  const [category, setCategory] = useState<WarningCategory>('safety')
  const [priority, setPriority] = useState<WarningPriority>('critical')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetType, setTargetType] = useState<WarningTargetType>('all')
  const [targetId, setTargetId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-set priority to critical when safety is selected
  function handleCategoryChange(cat: WarningCategory) {
    setCategory(cat)
    if (cat === 'safety') {
      setPriority('critical')
    }
  }

  function getResolvedTargetId(): string | undefined {
    if (targetType === 'all') return undefined
    if (targetType === 'jobsite') return jobsiteId
    if (targetType === 'worker' || targetType === 'crew') {
      return targetId.trim() || undefined
    }
    return undefined
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await createWarning(
        supabase,
        {
          lot_id: lotId,
          target_type: targetType,
          target_id: getResolvedTargetId(),
          category,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          expires_at: category === 'operational' && expiresAt ? new Date(expiresAt).toISOString() : undefined,
        },
        user.id,
      )

      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create warning')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5EA]">
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Send Warning</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F2F2F7] transition-colors"
          >
            <X className="w-5 h-5 text-[#8E8E93]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.map(cat => {
                const isActive = category === cat.value
                const Icon = cat.icon
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'text-white border-transparent'
                        : 'border-[#D2D2D7] bg-white hover:bg-[#F2F2F7]'
                    }`}
                    style={isActive ? { backgroundColor: cat.activeBg, borderColor: cat.activeBg } : { color: cat.color }}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Safety callout */}
          {category === 'safety' && (
            <div className="flex items-start gap-2 p-3 bg-[#FFE5E5] rounded-lg">
              <ShieldAlert className="w-4 h-4 text-[#FF3B30] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-[#FF3B30] font-medium">
                Safety warnings cannot be dismissed and require photo proof to resolve.
              </span>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(pri => {
                const isActive = priority === pri.value
                return (
                  <button
                    key={pri.value}
                    type="button"
                    onClick={() => setPriority(pri.value)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      isActive
                        ? 'text-white border-transparent'
                        : 'border-[#D2D2D7] bg-white hover:bg-[#F2F2F7]'
                    }`}
                    style={isActive ? { backgroundColor: pri.activeBg, borderColor: pri.activeBg } : { color: pri.color }}
                  >
                    {pri.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
              Title <span className="text-[#FF3B30]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Missing fall protection on second floor"
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide additional details..."
              rows={3}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
            />
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">Target</label>
            <div className="flex gap-2">
              {TARGET_TYPES.map(t => {
                const isActive = targetType === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { setTargetType(t.value); setTargetId('') }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                      isActive
                        ? 'text-white bg-[#007AFF] border-[#007AFF]'
                        : 'text-[#1D1D1F] border-[#D2D2D7] bg-white hover:bg-[#F2F2F7]'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Target ID input for worker/crew */}
            {targetType === 'worker' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  placeholder="Worker ID or name"
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>
            )}
            {targetType === 'crew' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  placeholder="Crew ID or name"
                  className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>
            )}
            {targetType === 'jobsite' && (
              <div className="mt-3">
                <div className="px-3 py-2 border border-[#E5E5EA] rounded-lg bg-[#F2F2F7] text-sm text-[#8E8E93]">
                  Jobsite: {jobsiteId.slice(0, 8)}...
                </div>
              </div>
            )}
          </div>

          {/* Expiry — only for operational */}
          {category === 'operational' && (
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">
                Expiry Date
                <span className="text-xs text-[#8E8E93] font-normal ml-1">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8E8E93]" />
                <input
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-[#FFE5E5] rounded-lg">
              <AlertTriangle className="w-4 h-4 text-[#FF3B30] flex-shrink-0" />
              <span className="text-sm text-[#FF3B30]">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
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
                  Sending...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Send Warning
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
