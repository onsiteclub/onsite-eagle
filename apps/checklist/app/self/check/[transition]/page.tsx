'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CHECKLIST_TEMPLATES,
  TRANSITION_LABELS,
  type ChecklistTransition,
  type TemplateItem,
} from '@/lib/templates'
import ProgressBar from '@/components/ProgressBar'
import PhotoCaptureLocal from '@/components/PhotoCaptureLocal'

type ItemResult = 'pending' | 'pass' | 'fail' | 'na'

interface ItemState {
  result: ItemResult
  notes: string
  photo: string | null // base64
}

interface SelfCheckInfo {
  name: string
  company: string
  jobsite: string
  lotNumber: string
  transition: string
  startedAt: string
}

export default function SelfChecklistPage() {
  const params = useParams()
  const router = useRouter()
  const transition = params.transition as ChecklistTransition

  const [info, setInfo] = useState<SelfCheckInfo | null>(null)
  const [items, setItems] = useState<TemplateItem[]>([])
  const [state, setState] = useState<Record<string, ItemState>>({})

  // Load templates and session info
  useEffect(() => {
    const templates = CHECKLIST_TEMPLATES[transition]
    if (!templates) {
      router.push('/self')
      return
    }

    const stored = sessionStorage.getItem('selfCheck')
    if (!stored) {
      router.push('/self')
      return
    }

    const parsed = JSON.parse(stored) as SelfCheckInfo
    setInfo(parsed)
    setItems(templates)

    // Init state for each item
    const initial: Record<string, ItemState> = {}
    templates.forEach((t) => {
      initial[t.code] = { result: 'pending', notes: '', photo: null }
    })
    setState(initial)
  }, [transition, router])

  const checkedCount = Object.values(state).filter((s) => s.result !== 'pending').length
  const totalCount = items.length

  function updateResult(code: string, result: ItemResult) {
    setState((prev) => ({
      ...prev,
      [code]: { ...prev[code], result },
    }))
  }

  function updateNotes(code: string, notes: string) {
    setState((prev) => ({
      ...prev,
      [code]: { ...prev[code], notes },
    }))
  }

  function updatePhoto(code: string, base64: string | null) {
    setState((prev) => ({
      ...prev,
      [code]: { ...prev[code], photo: base64 },
    }))
  }

  const allChecked = checkedCount === totalCount && totalCount > 0
  const hasBlockingFail = items.some(
    (item) => item.isBlocking && state[item.code]?.result === 'fail'
  )

  function handleSubmit() {
    // Store results in sessionStorage for the complete page
    sessionStorage.setItem('selfCheckResults', JSON.stringify({
      info,
      transition,
      transitionLabel: TRANSITION_LABELS[transition],
      items: items.map((item) => ({
        code: item.code,
        label: item.label,
        isBlocking: item.isBlocking,
        ...state[item.code],
      })),
      completedAt: new Date().toISOString(),
      passed: !hasBlockingFail,
    }))

    router.push(`/self/check/${transition}/complete`)
  }

  if (!info || items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <div className="text-[#667085]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] px-4 py-3">
        <div className="max-w-[480px] mx-auto">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push('/self')}
              className="text-sm text-[#667085] hover:text-[#101828]"
            >
              &larr; Back
            </button>
            <span className="text-xs text-[#667085]">
              {checkedCount}/{totalCount} checked
            </span>
          </div>
          <h1 className="text-base font-bold text-[#101828]">
            {TRANSITION_LABELS[transition]}
          </h1>
          <p className="text-xs text-[#667085]">
            {info.jobsite} — {info.lotNumber}
          </p>
          <div className="mt-2">
            <ProgressBar checked={checkedCount} total={totalCount} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-4">
        <div className="max-w-[480px] mx-auto space-y-3">
          {items.map((item, index) => {
            const s = state[item.code]
            if (!s) return null
            const isChecked = s.result !== 'pending'
            const showExpanded = s.result === 'fail'

            return (
              <div
                key={item.code}
                className={`
                  bg-white rounded-[14px] border transition-colors
                  ${s.result === 'pass' ? 'border-[#059669]/30' : ''}
                  ${s.result === 'fail' ? 'border-[#DC2626]/30' : ''}
                  ${s.result === 'na' ? 'border-[#9CA3AF]/30' : ''}
                  ${s.result === 'pending' ? 'border-[#E5E7EB]' : ''}
                `}
              >
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
                        <p className="text-sm text-[#101828] leading-snug">{item.label}</p>
                        {item.isBlocking && (
                          <span className="text-[10px] font-semibold text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">
                            BLOCKING
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5 font-mono">{item.code}</p>
                    </div>
                  </div>

                  {/* Result Buttons */}
                  <div className="flex gap-2 mt-3 ml-9">
                    <button
                      onClick={() => updateResult(item.code, 'pass')}
                      className={`
                        flex-1 h-10 rounded-[10px] text-xs font-semibold transition-all border
                        ${s.result === 'pass'
                          ? 'bg-[#ECFDF5] border-[#059669] text-[#059669]'
                          : 'bg-gray-50 border-gray-200 text-[#667085] hover:border-[#059669]'}
                      `}
                    >
                      &#10003; Pass
                    </button>
                    <button
                      onClick={() => updateResult(item.code, 'fail')}
                      className={`
                        flex-1 h-10 rounded-[10px] text-xs font-semibold transition-all border
                        ${s.result === 'fail'
                          ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]'
                          : 'bg-gray-50 border-gray-200 text-[#667085] hover:border-[#DC2626]'}
                      `}
                    >
                      &#10005; Fail
                    </button>
                    <button
                      onClick={() => updateResult(item.code, 'na')}
                      className={`
                        flex-1 h-10 rounded-[10px] text-xs font-semibold transition-all border
                        ${s.result === 'na'
                          ? 'bg-[#F3F4F6] border-[#9CA3AF] text-[#6B7280]'
                          : 'bg-gray-50 border-gray-200 text-[#667085] hover:border-[#9CA3AF]'}
                      `}
                    >
                      N/A
                    </button>
                  </div>
                </div>

                {/* Expanded: Photo + Notes on fail */}
                {showExpanded && (
                  <div className="px-4 pb-4 ml-9 space-y-3 border-t border-[#F3F4F6] pt-3">
                    <div className="flex items-center gap-2">
                      <PhotoCaptureLocal
                        itemCode={item.code}
                        existingBase64={s.photo}
                        onPhotoCaptured={(b64) => updatePhoto(item.code, b64)}
                        onPhotoRemoved={() => updatePhoto(item.code, null)}
                      />
                      {!s.photo && (
                        <span className="text-[10px] text-[#DC2626]">
                          Photo recommended for failed items
                        </span>
                      )}
                    </div>
                    <textarea
                      placeholder="Notes (optional)..."
                      value={s.notes}
                      onChange={(e) => updateNotes(item.code, e.target.value)}
                      rows={2}
                      className="w-full text-sm text-[#101828] placeholder:text-[#9CA3AF] border border-[#E5E7EB] rounded-[10px] px-3 py-2 resize-none"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky Submit */}
      <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] p-4">
        <div className="max-w-[480px] mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!allChecked}
            className={`
              w-full h-12 rounded-[10px] font-semibold text-base transition-colors
              ${allChecked
                ? 'bg-[#0F766E] text-white hover:bg-[#0d6b63]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  )
}
