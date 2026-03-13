'use client'

import { useState } from 'react'
import type { FrmGateCheckItem, GateCheckResult } from '@onsite/framing'
import PhotoCapture from './PhotoCapture'

interface Props {
  index: number
  item: FrmGateCheckItem
  isBlocking: boolean
  gateCheckId: string
  saving: boolean
  onResultChange: (itemId: string, result: GateCheckResult) => void
  onNotesChange: (itemId: string, notes: string) => void
  onPhotoUploaded: (itemId: string, url: string) => void
  onPhotoRemoved: (itemId: string) => void
}

export default function ChecklistItem({
  index,
  item,
  isBlocking,
  gateCheckId,
  saving,
  onResultChange,
  onNotesChange,
  onPhotoUploaded,
  onPhotoRemoved,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const result = item.result

  const isChecked = result !== 'pending'
  const showExpanded = expanded || result === 'fail'

  return (
    <div className={`
      bg-white rounded-[14px] border transition-colors
      ${result === 'pass' ? 'border-[#059669]/30' : ''}
      ${result === 'fail' ? 'border-[#DC2626]/30' : ''}
      ${result === 'na' ? 'border-[#9CA3AF]/30' : ''}
      ${result === 'pending' ? 'border-[#E5E7EB]' : ''}
    `}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className={`
            w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5
            ${isChecked ? 'bg-brand-500 text-white' : 'bg-gray-100 text-[#667085]'}
          `}>
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-[#101828] leading-snug">{item.item_label}</p>
              {isBlocking && (
                <span className="text-[10px] font-semibold text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">
                  BLOCKING
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5 font-mono">{item.item_code}</p>
          </div>
        </div>

        {/* Result Buttons */}
        <div className="flex gap-2 mt-3 ml-9">
          <button
            onClick={() => onResultChange(item.id, 'pass')}
            disabled={saving}
            className={`
              flex-1 h-10 rounded-[10px] text-xs font-semibold transition-all border
              ${result === 'pass'
                ? 'bg-[#ECFDF5] border-[#059669] text-[#059669]'
                : 'bg-gray-50 border-gray-200 text-[#667085] hover:border-[#059669]'}
            `}
          >
            &#10003; Pass
          </button>
          <button
            onClick={() => onResultChange(item.id, 'fail')}
            disabled={saving}
            className={`
              flex-1 h-10 rounded-[10px] text-xs font-semibold transition-all border
              ${result === 'fail'
                ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]'
                : 'bg-gray-50 border-gray-200 text-[#667085] hover:border-[#DC2626]'}
            `}
          >
            &#10005; Fail
          </button>
          <button
            onClick={() => onResultChange(item.id, 'na')}
            disabled={saving}
            className={`
              flex-1 h-10 rounded-[10px] text-xs font-semibold transition-all border
              ${result === 'na'
                ? 'bg-[#F3F4F6] border-[#9CA3AF] text-[#6B7280]'
                : 'bg-gray-50 border-gray-200 text-[#667085] hover:border-[#9CA3AF]'}
            `}
          >
            N/A
          </button>
        </div>
      </div>

      {/* Expanded: Photo + Notes (always show when fail, toggle for others) */}
      {showExpanded && (
        <div className="px-4 pb-4 ml-9 space-y-3 border-t border-[#F3F4F6] pt-3">
          {/* Photo */}
          <div className="flex items-center gap-2">
            <PhotoCapture
              gateCheckId={gateCheckId}
              itemCode={item.item_code}
              existingUrl={item.photo_url}
              onPhotoUploaded={(url) => onPhotoUploaded(item.id, url)}
              onPhotoRemoved={() => onPhotoRemoved(item.id)}
            />
            {result === 'fail' && !item.photo_url && (
              <span className="text-[10px] text-[#DC2626]">Photo recommended for failed items</span>
            )}
          </div>

          {/* Notes */}
          <textarea
            placeholder="Notes (optional)..."
            defaultValue={item.notes ?? ''}
            onBlur={(e) => onNotesChange(item.id, e.target.value)}
            rows={2}
            className="w-full text-sm text-[#101828] placeholder:text-[#9CA3AF] border border-[#E5E7EB] rounded-[10px] px-3 py-2 resize-none"
          />
        </div>
      )}

      {/* Toggle expand for non-fail results */}
      {isChecked && result !== 'fail' && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-[10px] text-[#9CA3AF] py-1 border-t border-[#F3F4F6] hover:text-[#667085]"
        >
          {expanded ? 'Hide details' : 'Add photo/notes'}
        </button>
      )}
    </div>
  )
}
