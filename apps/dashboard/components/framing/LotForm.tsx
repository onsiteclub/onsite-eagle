'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@onsite/supabase/client'
import { createLot, batchCreateLots } from '@onsite/framing'

interface LotFormProps {
  jobsiteId: string
  onClose: () => void
  onSaved: () => void
}

type Mode = 'single' | 'batch'

export function LotForm({ jobsiteId, onClose, onSaved }: LotFormProps) {
  const [mode, setMode] = useState<Mode>('single')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Single mode fields
  const [lotNumber, setLotNumber] = useState('')
  const [block, setBlock] = useState('')
  const [model, setModel] = useState('')
  const [address, setAddress] = useState('')
  const [totalSqft, setTotalSqft] = useState('')
  const [sqftMainFloors, setSqftMainFloors] = useState('')
  const [sqftRoof, setSqftRoof] = useState('')
  const [sqftBasement, setSqftBasement] = useState('')

  // Batch mode fields
  const [fromLot, setFromLot] = useState('')
  const [toLot, setToLot] = useState('')
  const [batchBlock, setBatchBlock] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const supabase = createClient()

      if (mode === 'single') {
        if (!lotNumber.trim()) {
          setError('Lot number is required.')
          setSaving(false)
          return
        }

        await createLot(supabase, {
          jobsite_id: jobsiteId,
          lot_number: lotNumber.trim(),
          block: block.trim() || undefined,
          model: model.trim() || undefined,
          address: address.trim() || undefined,
          total_sqft: totalSqft ? parseFloat(totalSqft) : undefined,
          sqft_main_floors: sqftMainFloors ? parseFloat(sqftMainFloors) : undefined,
          sqft_roof: sqftRoof ? parseFloat(sqftRoof) : undefined,
          sqft_basement: sqftBasement ? parseFloat(sqftBasement) : undefined,
        })
      } else {
        const from = parseInt(fromLot)
        const to = parseInt(toLot)

        if (isNaN(from) || isNaN(to) || from > to) {
          setError('Enter a valid range (from must be less than or equal to to).')
          setSaving(false)
          return
        }

        if (to - from + 1 > 200) {
          setError('Maximum 200 lots at a time.')
          setSaving(false)
          return
        }

        const lots = []
        for (let i = from; i <= to; i++) {
          lots.push({
            lot_number: i.toString(),
            block: batchBlock.trim() || undefined,
          })
        }

        await batchCreateLots(supabase, jobsiteId, lots)
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lot(s).')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#101828]">Add Lots</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#667085]" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-4">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                mode === 'single' ? 'bg-white text-[#101828] shadow-sm' : 'text-[#667085]'
              }`}
            >
              Single Lot
            </button>
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                mode === 'batch' ? 'bg-white text-[#101828] shadow-sm' : 'text-[#667085]'
              }`}
            >
              Batch (Range)
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {mode === 'single' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">
                    Lot Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={e => setLotNumber(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Block</label>
                  <input
                    type="text"
                    value={block}
                    onChange={e => setBlock(e.target.value)}
                    placeholder="e.g. A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="e.g. Avalon 2000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Lot address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Total sqft</label>
                  <input
                    type="number"
                    value={totalSqft}
                    onChange={e => setTotalSqft(e.target.value)}
                    placeholder="e.g. 2400"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Main Floors sqft</label>
                  <input
                    type="number"
                    value={sqftMainFloors}
                    onChange={e => setSqftMainFloors(e.target.value)}
                    placeholder="e.g. 1200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Roof sqft</label>
                  <input
                    type="number"
                    value={sqftRoof}
                    onChange={e => setSqftRoof(e.target.value)}
                    placeholder="e.g. 800"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Basement sqft</label>
                  <input
                    type="number"
                    value={sqftBasement}
                    onChange={e => setSqftBasement(e.target.value)}
                    placeholder="e.g. 400"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[#667085]">
                Create multiple lots at once by specifying a range. Each lot will be numbered sequentially.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">
                    From Lot <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={fromLot}
                    onChange={e => setFromLot(e.target.value)}
                    placeholder="1"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">
                    To Lot <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={toLot}
                    onChange={e => setToLot(e.target.value)}
                    placeholder="65"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#101828] mb-1">Block</label>
                  <input
                    type="text"
                    value={batchBlock}
                    onChange={e => setBatchBlock(e.target.value)}
                    placeholder="e.g. A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              {fromLot && toLot && parseInt(toLot) >= parseInt(fromLot) && (
                <p className="text-xs text-[#667085]">
                  This will create {parseInt(toLot) - parseInt(fromLot) + 1} lots (Lot {fromLot} to Lot {toLot}).
                </p>
              )}
            </>
          )}

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
              {saving ? 'Creating...' : mode === 'single' ? 'Create Lot' : 'Create Lots'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
