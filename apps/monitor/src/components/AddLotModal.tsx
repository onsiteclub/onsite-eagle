'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Hash, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@onsite/logger'

interface AddLotModalProps {
  isOpen: boolean
  onClose: () => void
  siteId: string
  onSuccess: () => void
}

export default function AddLotModal({ isOpen, onClose, siteId, onSuccess }: AddLotModalProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('bulk')
  const [lotNumber, setLotNumber] = useState('')
  const [address, setAddress] = useState('')
  const [bulkCount, setBulkCount] = useState('')
  const [startFrom, setStartFrom] = useState('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [existingLots, setExistingLots] = useState<string[]>([])

  // Fetch existing lots to determine next available number
  useEffect(() => {
    if (isOpen) {
      fetchExistingLots()
    }
  }, [isOpen, siteId])

  async function fetchExistingLots() {
    const { data } = await supabase
      .from('frm_lots')
      .select('lot_number')
      .eq('jobsite_id', siteId)

    if (data) {
      const lots = data.map(h => h.lot_number)
      setExistingLots(lots)

      // Find highest numeric lot number and suggest next
      const numericLots = lots
        .map(l => parseInt(l, 10))
        .filter(n => !isNaN(n))

      if (numericLots.length > 0) {
        const maxLot = Math.max(...numericLots)
        setStartFrom(String(maxLot + 1))
      } else {
        setStartFrom('1')
      }
    }
  }

  if (!isOpen) return null

  // Single lot submission
  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!lotNumber.trim()) {
      setError('Lot number is required')
      return
    }

    setLoading(true)

    try {
      const { error: insertError } = await supabase
        .from('frm_lots')
        .insert({
          jobsite_id: siteId,
          lot_number: lotNumber.trim(),
          address: address.trim() || null,
          status: 'pending',
          current_phase: 1,
          progress_percentage: 0,
          is_issued: false, // Locked until issued with worker & plans
        })

      if (insertError) {
        if (insertError.code === '23505') {
          setError(`Lot #${lotNumber} already exists`)
        } else {
          setError(insertError.message)
        }
        return
      }

      // Update site's total_lots count
      await updateSiteTotalLots(1)

      resetAndClose()
    } catch (err) {
      console.error('Error creating lot:', err)
      setError('Failed to create lot')
    } finally {
      setLoading(false)
    }
  }

  // Bulk lots submission
  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const count = parseInt(bulkCount, 10)
    const start = parseInt(startFrom, 10)

    if (isNaN(count) || count < 1) {
      setError('Enter a valid number of lots')
      return
    }

    if (count > 200) {
      setError('Maximum 200 lots at a time')
      return
    }

    if (isNaN(start) || start < 1) {
      setError('Start number must be at least 1')
      return
    }

    setLoading(true)
    setProgress({ current: 0, total: count })

    try {
      // Check for conflicts first
      const lotsToCreate: { lot_number: string; jobsite_id: string; status: string; current_phase: number; progress_percentage: number; is_issued: boolean }[] = []
      const conflicts: string[] = []

      for (let i = 0; i < count; i++) {
        const lotNum = String(start + i)
        if (existingLots.includes(lotNum)) {
          conflicts.push(lotNum)
        } else {
          lotsToCreate.push({
            jobsite_id: siteId,
            lot_number: lotNum,
            status: 'pending',
            current_phase: 1,
            progress_percentage: 0,
            is_issued: false, // Locked until issued with worker & plans
          })
        }
      }

      if (conflicts.length > 0 && lotsToCreate.length === 0) {
        setError(`All lots already exist: #${conflicts.join(', #')}`)
        setLoading(false)
        setProgress(null)
        return
      }

      // Batch insert in chunks of 50
      const chunkSize = 50
      let created = 0

      logger.info('EAGLE', 'Creating lots for site', { siteId, count: lotsToCreate.length })

      for (let i = 0; i < lotsToCreate.length; i += chunkSize) {
        const chunk = lotsToCreate.slice(i, i + chunkSize)
        logger.debug('EAGLE', 'Inserting chunk', { chunkSize: chunk.length })

        const { data: insertedData, error: insertError } = await supabase
          .from('frm_lots')
          .insert(chunk)
          .select()

        if (insertError) {
          console.error('[AddLotModal] Insert error:', insertError)
          setError(`Error creating lots: ${insertError.message}`)
          break
        }

        const insertedCount = insertedData?.length ?? 0
        logger.debug('EAGLE', 'Inserted lots', { insertedCount })

        if (insertedCount === 0) {
          console.error('[AddLotModal] Insert returned empty - RLS may be blocking')
          setError('Failed to create lots. Please check permissions.')
          break
        }

        created += insertedCount
        setProgress({ current: created, total: lotsToCreate.length })
      }

      // Update site's total_lots count
      if (created > 0) {
        await updateSiteTotalLots(created)
      }

      if (conflicts.length > 0) {
        // Show warning but still close
        console.warn(`Skipped existing lots: #${conflicts.join(', #')}`)
      }

      resetAndClose()
    } catch (err) {
      console.error('Error creating lots:', err)
      setError('Failed to create lots')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  async function updateSiteTotalLots(addCount: number) {
    // Count actual lots in the database to ensure accuracy
    const { count, error: countError } = await supabase
      .from('frm_lots')
      .select('*', { count: 'exact', head: true })
      .eq('jobsite_id', siteId)

    if (countError) {
      console.error('[AddLotModal] Error counting lots:', countError)
      // Fallback to incremental update
      const { data: siteData } = await supabase
        .from('frm_jobsites')
        .select('total_lots')
        .eq('id', siteId)
        .single()

      if (siteData) {
        await supabase
          .from('frm_jobsites')
          .update({ total_lots: (siteData.total_lots || 0) + addCount })
          .eq('id', siteId)
      }
    } else {
      // Use actual count from database
      logger.info('EAGLE', 'Syncing total_lots to actual count', { count: count ?? 0 })
      await supabase
        .from('frm_jobsites')
        .update({ total_lots: count || 0 })
        .eq('id', siteId)
    }
  }

  function resetAndClose() {
    setLotNumber('')
    setAddress('')
    setBulkCount('')
    setError(null)
    setProgress(null)
    onSuccess()
    onClose()
  }

  function handleClose() {
    if (!loading) {
      setLotNumber('')
      setAddress('')
      setBulkCount('')
      setError(null)
      setProgress(null)
      onClose()
    }
  }

  // Preview lots to be created
  const previewLots = () => {
    const count = parseInt(bulkCount, 10)
    const start = parseInt(startFrom, 10)
    if (isNaN(count) || isNaN(start) || count < 1) return []

    const preview: string[] = []
    for (let i = 0; i < Math.min(count, 5); i++) {
      preview.push(`#${start + i}`)
    }
    if (count > 5) {
      preview.push(`... #${start + count - 1}`)
    }
    return preview
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E5EA]">
          <h2 className="text-xl font-semibold text-[#1D1D1F]">Add Lots</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 p-1 bg-[#F5F5F7] rounded-lg">
            <button
              type="button"
              onClick={() => setMode('bulk')}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'bulk'
                  ? 'bg-white text-[#007AFF] shadow-sm'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              <Layers className="w-4 h-4" />
              Bulk Create
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-white text-[#007AFF] shadow-sm'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              <Hash className="w-4 h-4" />
              Single Lot
            </button>
          </div>
        </div>

        {/* Bulk Mode Form */}
        {mode === 'bulk' && (
          <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
            <div className="bg-[#F5F5F7] rounded-xl p-4">
              <p className="text-sm text-[#6E6E73] mb-3">
                Create multiple lots at once. Lots will be numbered sequentially.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Number of lots */}
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                    How many lots?
                  </label>
                  <input
                    type="number"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    placeholder="e.g., 20"
                    min="1"
                    max="200"
                    className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {/* Starting number */}
                <div>
                  <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                    Start from #
                  </label>
                  <input
                    type="number"
                    value={startFrom}
                    onChange={(e) => setStartFrom(e.target.value)}
                    placeholder="1"
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Preview */}
              {bulkCount && parseInt(bulkCount, 10) > 0 && (
                <div className="mt-3 pt-3 border-t border-[#E5E5EA]">
                  <p className="text-xs text-[#86868B] mb-1">Will create:</p>
                  <div className="flex flex-wrap gap-1">
                    {previewLots().map((lot, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-[#007AFF]/10 text-[#007AFF] rounded text-sm font-medium"
                      >
                        {lot}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Existing lots warning */}
            {existingLots.length > 0 && (
              <p className="text-xs text-[#86868B]">
                {existingLots.length} lot{existingLots.length !== 1 ? 's' : ''} already exist. Duplicates will be skipped.
              </p>
            )}

            {/* Progress */}
            {progress && (
              <div className="bg-[#007AFF]/10 rounded-lg p-3">
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

            {/* Error */}
            {error && (
              <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-lg">
                <p className="text-sm text-[#FF3B30]">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 text-[#007AFF] bg-[#007AFF]/10 rounded-lg hover:bg-[#007AFF]/20 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !bulkCount || parseInt(bulkCount, 10) < 1}
                className="flex-1 px-4 py-3 text-white bg-[#007AFF] rounded-lg hover:bg-[#0056B3] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create {bulkCount ? `${bulkCount} Lots` : 'Lots'}</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Single Mode Form */}
        {mode === 'single' && (
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-4">
            {/* Lot Number */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                Lot Number <span className="text-[#FF3B30]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]">#</span>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="e.g., 1, 2, 3..."
                  className="w-full pl-7 pr-4 py-3 bg-white border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                Address <span className="text-[#86868B] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 Main Street"
                className="w-full px-4 py-3 bg-white border border-[#D2D2D7] rounded-lg text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                disabled={loading}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-lg">
                <p className="text-sm text-[#FF3B30]">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 text-[#007AFF] bg-[#007AFF]/10 rounded-lg hover:bg-[#007AFF]/20 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !lotNumber.trim()}
                className="flex-1 px-4 py-3 text-white bg-[#007AFF] rounded-lg hover:bg-[#0056B3] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Add Lot #{lotNumber || '...'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
