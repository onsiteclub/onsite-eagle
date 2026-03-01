'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Package, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { House, MaterialType, UrgencyLevel } from '@onsite/shared'
import { createMaterialRequest } from '@onsite/shared'

interface CreateMaterialRequestModalProps {
  isOpen: boolean
  onClose: () => void
  siteId: string
  houses?: House[]  // Optional when using preselectedHouseId
  onSuccess: () => void
  // Lot-level props
  preselectedHouseId?: string
  preselectedLotNumber?: string
}

const URGENCY_OPTIONS: { value: UrgencyLevel; label: string; description: string; color: string }[] = [
  { value: 'low', label: 'Low', description: 'Can wait 24+ hours', color: '#8E8E93' },
  { value: 'medium', label: 'Medium', description: 'Needed within the day', color: '#FFCC00' },
  { value: 'high', label: 'High', description: 'Needed within hours', color: '#FF9500' },
  { value: 'critical', label: 'Critical', description: 'Blocking work NOW', color: '#FF3B30' }
]

export default function CreateMaterialRequestModal({
  isOpen,
  onClose,
  siteId,
  houses,
  onSuccess,
  preselectedHouseId,
  preselectedLotNumber
}: CreateMaterialRequestModalProps) {
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine if we're in lot-level mode
  const isLotLevel = !!preselectedHouseId

  // Form state - pre-select house if provided
  const [houseId, setHouseId] = useState<string>(preselectedHouseId || '')
  const [materialType, setMaterialType] = useState('')
  const [materialName, setMaterialName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('medium')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [notes, setNotes] = useState('')

  // Load material types on mount
  useEffect(() => {
    if (isOpen) {
      loadMaterialTypes()
    }
  }, [isOpen])

  async function loadMaterialTypes() {
    const { data, error } = await supabase
      .from('ref_material_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (data && !error) {
      setMaterialTypes(data)
    }
  }

  // Auto-fill material name when type is selected
  useEffect(() => {
    if (materialType) {
      const selected = materialTypes.find(t => t.code === materialType)
      if (selected) {
        setMaterialName(selected.name_en)
        setUnit(selected.default_unit)
      }
    }
  }, [materialType, materialTypes])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (!materialType) {
      setError('Please select a material type')
      return
    }
    if (!materialName.trim()) {
      setError('Material name is required')
      return
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Please enter a valid quantity')
      return
    }

    setLoading(true)

    try {
      // Get current user info (or use placeholder for now)
      const { data: { user } } = await supabase.auth.getUser()
      const userName = user?.email?.split('@')[0] || 'Supervisor'

      // Use shared function to create the material request
      const { data: newRequest, error: insertError } = await createMaterialRequest(
        supabase,
        {
          jobsite_id: siteId,
          lot_id: houseId || '',
          phase_id: '',
          material_type: materialType,
          material_name: materialName.trim(),
          quantity: parseFloat(quantity),
          unit: unit,
          urgency_level: urgencyLevel,
          delivery_location: deliveryLocation.trim() || null,
          notes: notes.trim() || null,
          requested_by: user?.id || '',
          requested_by_name: userName,
        } as any
      )

      if (insertError) {
        console.error('Insert error:', insertError)
        setError(insertError.message)
        return
      }

      // Create a message in the chat timeline
      const urgencyLabel = URGENCY_OPTIONS.find(u => u.value === urgencyLevel)?.label || urgencyLevel
      const urgencyEmoji = urgencyLevel === 'critical' ? '🚨' : urgencyLevel === 'high' ? '⚠️' : urgencyLevel === 'medium' ? '📦' : '📋'

      const { error: messageError } = await supabase.from('frm_messages').insert({
        jobsite_id: siteId,
        lot_id: houseId || null,
        sender_type: 'system',
        sender_name: 'Material Request',
        content: `${urgencyEmoji} **Material Requested:** ${materialName}\n\n**Quantity:** ${quantity} ${unit}\n**Urgency:** ${urgencyLabel}${deliveryLocation.trim() ? `\n**Drop Location:** ${deliveryLocation.trim()}` : ''}${notes.trim() ? `\n**Notes:** ${notes.trim()}` : ''}`,
        is_ai_response: false,
        metadata: {
          type: 'material_request',
          material_type: materialType,
          quantity: parseFloat(quantity),
          unit: unit,
          urgency_level: urgencyLevel
        }
      })

      if (messageError) {
        console.error('Message insert error:', messageError)
      }

      // Also create a timeline event for historical record
      if (houseId) {
        const { error: timelineError } = await supabase.from('frm_timeline').insert({
          lot_id: houseId,
          event_type: 'material',
          title: `Material Requested: ${materialName}`,
          description: `${quantity} ${unit} - ${urgencyLabel} urgency`,
          source: 'monitor',
          created_by: null
        })

        if (timelineError) {
          console.error('Timeline insert error:', timelineError)
        }
      }

      resetForm()
      onSuccess()
    } catch (err) {
      console.error('Error creating request:', err)
      setError('Failed to create material request')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setHouseId(preselectedHouseId || '')  // Reset to preselected or empty
    setMaterialType('')
    setMaterialName('')
    setQuantity('')
    setUnit('pcs')
    setUrgencyLevel('medium')
    setDeliveryLocation('')
    setNotes('')
    setError(null)
  }

  // Group material types by category
  const groupedTypes = materialTypes.reduce((acc, type) => {
    const category = type.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(type)
    return acc
  }, {} as Record<string, MaterialType[]>)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E5EA] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">New Material Request</h2>
              <p className="text-sm text-[#86868B]">Request materials for delivery</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); onClose() }}
            className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#86868B]" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Lot Selection */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
              {isLotLevel ? 'Lot' : 'Delivery Location'}
            </label>
            {isLotLevel ? (
              // Show read-only lot display when pre-selected
              <div className="w-full px-3 py-2 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F]">
                Lot {preselectedLotNumber}
              </div>
            ) : (
              // Show dropdown when at site level
              <select
                value={houseId}
                onChange={(e) => setHouseId(e.target.value)}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
              >
                <option value="">Site-wide (no specific lot)</option>
                {houses?.map(house => (
                  <option key={house.id} value={house.id}>
                    Lot {house.lot_number}{house.address ? ` - ${house.address}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Material Type */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
              Material Type *
            </label>
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
            >
              <option value="">Select material type...</option>
              {Object.entries(groupedTypes).map(([category, types]) => (
                <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                  {types.map(type => (
                    <option key={type.code} value={type.code}>
                      {type.icon} {type.name_en}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Material Name */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
              Material Description *
            </label>
            <input
              type="text"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              placeholder="e.g., 2x4x8 SPF, 1/2 inch drywall sheets"
              required
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
            />
          </div>

          {/* Quantity & Unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                Quantity *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="10"
                required
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
              >
                <option value="pcs">pieces</option>
                <option value="sheets">sheets</option>
                <option value="rolls">rolls</option>
                <option value="bags">bags</option>
                <option value="boxes">boxes</option>
                <option value="bundles">bundles</option>
                <option value="ft">feet</option>
                <option value="m">meters</option>
                <option value="unit">units</option>
              </select>
            </div>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
              Urgency *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {URGENCY_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setUrgencyLevel(option.value)}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    urgencyLevel === option.value
                      ? 'border-[#007AFF] bg-[#007AFF]/5'
                      : 'border-[#D2D2D7] hover:border-[#007AFF]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="font-medium text-[#1D1D1F]">{option.label}</span>
                  </div>
                  <p className="text-xs text-[#86868B] mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Location Note */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
              Drop Location (optional)
            </label>
            <input
              type="text"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              placeholder="e.g., Front of lot, Garage area, Back door"
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details for the operator..."
              rows={2}
              className="w-full px-3 py-2 border border-[#D2D2D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-[#FFE5E5] text-[#FF3B30] rounded-lg">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex gap-3 p-4 border-t border-[#E5E5EA] flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={() => { resetForm(); onClose() }}
              className="flex-1 px-4 py-2.5 border border-[#D2D2D7] text-[#1D1D1F] rounded-lg hover:bg-[#F5F5F7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056CC] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
