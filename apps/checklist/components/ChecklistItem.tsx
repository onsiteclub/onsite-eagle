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
      ${result === 'pass' ? 'border-[#16A34A]/30' : ''}
      ${result === 'fail' ? 'border-[#DC2626]/30' : ''}
      ${result === 'na' ? 'border-[#B0AFA9]/30' : ''}
      ${result === 'pending' ? 'border-[#D1D0CE]' : ''}
    `}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className={`
            w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5
            ${isChecked ? 'bg-brand-500 text-white' : 'bg-[#F5F5F4] text-[#888884]'}
          `}>
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] text-[#1A1A1A] leading-snug">{item.item_label}</p>
              {isBlocking && (
                <span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.12)] px-1.5 py-0.5 rounded flex-shrink-0">
                  BLOCKING
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#B0AFA9] mt-0.5 font-mono">{item.item_code}</p>
          </div>
        </div>

        {/* Result Buttons */}
        <div className="flex gap-2 mt-3 ml-9">
          <button
            onClick={() => onResultChange(item.id, 'pass')}
            disabled={saving}
            className={`
              flex-1 h-[52px] rounded-[14px] text-xs font-semibold transition-all border
              ${result === 'pass'
                ? 'bg-[#D1FAE5] border-[#16A34A] text-[#16A34A]'
                : 'bg-[#F5F5F4] border-[#D1D0CE] text-[#888884] hover:border-[#16A34A]'}
            `}
          >
            &#10003; Pass
          </button>
          <button
            onClick={() => onResultChange(item.id, 'fail')}
            disabled={saving}
            className={`
              flex-1 h-[52px] rounded-[14px] text-xs font-semibold transition-all border
              ${result === 'fail'
                ? 'bg-[rgba(220,38,38,0.12)] border-[#DC2626] text-[#DC2626]'
                : 'bg-[#F5F5F4] border-[#D1D0CE] text-[#888884] hover:border-[#DC2626]'}
            `}
          >
            &#10005; Fail
          </button>
          <button
            onClick={() => onResultChange(item.id, 'na')}
            disabled={saving}
            className={`
              flex-1 h-[52px] rounded-[14px] text-xs font-semibold transition-all border
              ${result === 'na'
                ? 'bg-[#E5E5E3] border-[#B0AFA9] text-[#888884]'
                : 'bg-[#F5F5F4] border-[#D1D0CE] text-[#888884] hover:border-[#B0AFA9]'}
            `}
          >
            N/A
          </button>
        </div>
      </div>

      {/* Expanded: Photo + Notes (always show when fail, toggle for others) */}
      {showExpanded && (
        <div className="px-4 pb-4 ml-9 space-y-3 border-t border-[#E5E5E3] pt-3">
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
            className="w-full text-[15px] text-[#1A1A1A] placeholder:text-[#B0AFA9] border border-[#D1D0CE] rounded-[14px] px-3 py-2 resize-none focus:border-[#C58B1B] focus:outline-none"
          />
        </div>
      )}

      {/* Toggle expand for non-fail results */}
      {isChecked && result !== 'fail' && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-[10px] text-[#B0AFA9] py-1 border-t border-[#E5E5E3] hover:text-[#888884]"
        >
          {expanded ? 'Hide details' : 'Add photo/notes'}
        </button>
      )}
    </div>
  )
}
