'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, MapPin, Calendar, Hash, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@onsite/logger'

export default function NewSitePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    total_lots: '',
    start_date: '',
    expected_end_date: ''
  })
  const [autoCreateLots, setAutoCreateLots] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter a site name')
      return
    }

    const totalLots = formData.total_lots ? parseInt(formData.total_lots) : 0

    setLoading(true)
    try {
      logger.info('EAGLE', 'Creating site', { formData })

      // Use frm_jobsites table directly (sites is a view)
      // If auto-creating lots, set total_lots to 0 initially (will be updated after lots are created)
      const { data, error } = await supabase
        .from('frm_jobsites')
        .insert({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          total_lots: autoCreateLots ? 0 : totalLots,
          completed_lots: 0,
          start_date: formData.start_date || null,
          expected_end_date: formData.expected_end_date || null
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      logger.info('EAGLE', 'Site created', { siteId: data.id, name: data.name })

      // Auto-create lots if enabled and total_lots is specified
      if (autoCreateLots && totalLots > 0) {
        logger.info('EAGLE', 'Creating lots for site', { totalLots, siteId: data.id })
        setProgress({ current: 0, total: totalLots })

        const lotsToCreate = []
        for (let i = 1; i <= totalLots; i++) {
          lotsToCreate.push({
            jobsite_id: data.id,
            lot_number: String(i),
            status: 'pending',
            current_phase: 1,
            progress_percentage: 0,
            is_issued: false, // Locked until issued with worker & plans
          })
        }

        // Batch insert in chunks of 50
        const chunkSize = 50
        let created = 0

        for (let i = 0; i < lotsToCreate.length; i += chunkSize) {
          const chunk = lotsToCreate.slice(i, i + chunkSize)

          const { data: insertedData, error: insertError } = await supabase
            .from('frm_lots')
            .insert(chunk)
            .select()

          if (insertError) {
            console.error('Error creating lots:', insertError)
            throw new Error(`Failed to create lots: ${insertError.message}`)
          }

          const insertedCount = insertedData?.length ?? 0
          if (insertedCount === 0) {
            throw new Error('Failed to create lots. Please check permissions.')
          }

          created += insertedCount
          setProgress({ current: created, total: totalLots })
          logger.debug('EAGLE', 'Lots creation progress', { created, totalLots })
        }

        // Update total_lots count with actual created count
        await supabase
          .from('frm_jobsites')
          .update({ total_lots: created })
          .eq('id', data.id)

        logger.info('EAGLE', 'All lots created successfully', { created })
      }

      router.push(`/site/${data.id}`)
    } catch (error: any) {
      console.error('Error creating site:', error)

      // Show more specific error message
      if (error?.code === '42501') {
        alert('Permission denied. You need to be logged in to create a site.')
      } else if (error?.message) {
        alert(`Error: ${error.message}`)
      } else {
        alert('Failed to create site. Please try again.')
      }
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#D2D2D7]">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-[#1D1D1F]">New Jobsite</h1>
              <p className="text-sm text-[#86868B]">Add a new construction site</p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
              Site Name *
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
              <input
                type="text"
                required
                placeholder="e.g., Maple Heights Phase 2"
                className="w-full bg-white border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
              <input
                type="text"
                placeholder="e.g., 123 Construction Ave"
                className="w-full bg-white border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
              City
            </label>
            <input
              type="text"
              placeholder="e.g., Toronto, ON"
              className="w-full bg-white border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          {/* Total Lots */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
              Number of Lots
            </label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
              <input
                type="number"
                min="0"
                max="500"
                placeholder="e.g., 24"
                className="w-full bg-white border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                value={formData.total_lots}
                onChange={(e) => setFormData({ ...formData, total_lots: e.target.value })}
              />
            </div>

            {/* Auto-create checkbox */}
            {formData.total_lots && parseInt(formData.total_lots) > 0 && (
              <label className="flex items-center gap-3 mt-3 p-3 bg-[#F5F5F7] rounded-lg cursor-pointer hover:bg-[#E5E5EA] transition-colors">
                <input
                  type="checkbox"
                  checked={autoCreateLots}
                  onChange={(e) => setAutoCreateLots(e.target.checked)}
                  className="w-5 h-5 rounded border-[#D2D2D7] text-[#007AFF] focus:ring-[#007AFF] cursor-pointer"
                />
                <div>
                  <p className="text-sm font-medium text-[#1D1D1F]">
                    Auto-create {formData.total_lots} lots
                  </p>
                  <p className="text-xs text-[#86868B]">
                    Lots will be numbered 1 to {formData.total_lots}
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
                <input
                  type="date"
                  className="w-full bg-white border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                Expected End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
                <input
                  type="date"
                  className="w-full bg-white border border-[#D2D2D7] rounded-xl pl-12 pr-4 py-3 text-[#1D1D1F] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  value={formData.expected_end_date}
                  onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          {progress && (
            <div className="bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#007AFF] font-medium">Creating lots...</span>
                <span className="text-sm text-[#007AFF]">{progress.current}/{progress.total}</span>
              </div>
              <div className="h-2 bg-[#007AFF]/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#007AFF] rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#007AFF] hover:bg-[#0056B3] disabled:bg-[#AEAEB2] disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{progress ? 'Creating Lots...' : 'Creating Site...'}</span>
                </>
              ) : (
                <span>
                  {autoCreateLots && formData.total_lots && parseInt(formData.total_lots) > 0
                    ? `Create Jobsite with ${formData.total_lots} Lots`
                    : 'Create Jobsite'
                  }
                </span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
