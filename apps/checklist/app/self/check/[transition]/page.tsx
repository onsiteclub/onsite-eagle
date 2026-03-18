'use client'

import { useState, useEffect, useRef } from 'react'
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
  photos: string[] // base64 array (up to 5)
  showNotes: boolean
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
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Load templates and session info — only once
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

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
      initial[t.code] = { result: 'pending', notes: '', photos: [], showNotes: false }
    })
    setState(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition])

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

  function updatePhotos(code: string, photos: string[]) {
    setState((prev) => ({
      ...prev,
      [code]: { ...prev[code], photos },
    }))
  }

  const allChecked = checkedCount === totalCount && totalCount > 0
  const hasBlockingFail = items.some(
    (item) => item.isBlocking && state[item.code]?.result === 'fail'
  )

  // Check cleanup photo requirements
  const cleanupPhotosMissing = items.some((item) => {
    if (!item.minPhotos) return false
    const s = state[item.code]
    if (!s || s.result === 'na' || s.result === 'pending') return false
    return s.photos.length < item.minPhotos
  })

  const canSubmit = allChecked && !cleanupPhotosMissing

  async function handleSubmit() {
    if (!info) return
    setSubmitting(true)
    setSubmitError(null)

    const payload = {
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
      startedAt: info.startedAt,
    }

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to save report')

      const { token, reference } = await res.json()

      // Also store in sessionStorage for PDF fallback on complete page
      sessionStorage.setItem('selfCheckResults', JSON.stringify(payload))

      router.push(`/self/check/${transition}/complete?token=${token}&ref=${encodeURIComponent(reference)}`)
    } catch (err) {
      console.error('Submit error:', err)
      setSubmitError('Failed to upload. You can still download a PDF.')

      // Fallback: save to sessionStorage and navigate without token
      sessionStorage.setItem('selfCheckResults', JSON.stringify(payload))
      router.push(`/self/check/${transition}/complete`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!info || items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <div className="text-[#888884]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex flex-col">
      {/* Dark Header */}
      <div className="sticky top-0 z-20 bg-[#1A1A1A] px-4 py-3">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#C58B1B] flex items-center justify-center">
              <span className="text-white font-bold text-sm">GC</span>
            </div>
            <span className="font-semibold text-white text-[15px]">Gate Check</span>
          </div>
          <span className="text-xs text-[#B0AFA9]">
            {checkedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Sub-header */}
      <div className="sticky top-[57px] z-10 bg-[#F5F5F4] border-b border-[#D1D0CE] px-4 py-3">
        <div className="max-w-[480px] mx-auto">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => router.push('/self')}
              className="text-[13px] text-[#C58B1B] hover:text-[#A67516]"
            >
              &larr; Back
            </button>
          </div>
          <h1 className="text-base font-bold text-[#1A1A1A]">
            {TRANSITION_LABELS[transition]}
          </h1>
          <p className="text-xs text-[#888884]">
            {info.jobsite} — {info.lotNumber}
          </p>
          <div className="mt-2">
            <ProgressBar checked={checkedCount} total={totalCount} />
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="px-4 pt-3">
        <div className="max-w-[480px] mx-auto">
          <div className="bg-[#FFF3D6] border border-[#F2D28B] rounded-[14px] px-3 py-2 text-[11px] text-[#8F6513]">
            You can attach up to 5 photos per item. Photos are optional but recommended.
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
            const needsPhotos = s.result !== 'pending' && s.result !== 'na'
            const notesVisible = s.showNotes || s.result === 'fail' || s.notes.length > 0

            return (
              <div
                key={item.code}
                className={`
                  bg-white rounded-[14px] border transition-colors
                  ${s.result === 'pass' ? 'border-[#16A34A]/30' : ''}
                  ${s.result === 'fail' ? 'border-[#DC2626]/30' : ''}
                  ${s.result === 'na' ? 'border-[#B0AFA9]/30' : ''}
                  ${s.result === 'pending' ? 'border-[#D1D0CE]' : ''}
                `}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5
                      ${isChecked ? 'bg-[#C58B1B] text-white' : 'bg-[#F5F5F4] text-[#888884]'}
                    `}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] text-[#1A1A1A] leading-snug">{item.label}</p>
                        {item.isBlocking && (
                          <span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.12)] px-1.5 py-0.5 rounded flex-shrink-0">
                            BLOCKING
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#B0AFA9] mt-0.5 font-mono">{item.code}</p>
                    </div>
                  </div>

                  {/* Result Buttons */}
                  <div className="flex gap-2 mt-3 ml-9">
                    <button
                      onClick={() => updateResult(item.code, 'pass')}
                      className={`
                        flex-1 h-[52px] rounded-[14px] text-xs font-semibold transition-all border
                        ${s.result === 'pass'
                          ? 'bg-[#D1FAE5] border-[#16A34A] text-[#16A34A]'
                          : 'bg-[#F5F5F4] border-[#D1D0CE] text-[#888884] hover:border-[#16A34A]'}
                      `}
                    >
                      &#10003; Pass
                    </button>
                    <button
                      onClick={() => updateResult(item.code, 'fail')}
                      className={`
                        flex-1 h-[52px] rounded-[14px] text-xs font-semibold transition-all border
                        ${s.result === 'fail'
                          ? 'bg-[rgba(220,38,38,0.12)] border-[#DC2626] text-[#DC2626]'
                          : 'bg-[#F5F5F4] border-[#D1D0CE] text-[#888884] hover:border-[#DC2626]'}
                      `}
                    >
                      &#10005; Fail
                    </button>
                    <button
                      onClick={() => updateResult(item.code, 'na')}
                      className={`
                        flex-1 h-[52px] rounded-[14px] text-xs font-semibold transition-all border
                        ${s.result === 'na'
                          ? 'bg-[#E5E5E3] border-[#B0AFA9] text-[#888884]'
                          : 'bg-[#F5F5F4] border-[#D1D0CE] text-[#888884] hover:border-[#B0AFA9]'}
                      `}
                    >
                      N/A
                    </button>
                  </div>

                  {/* + Add Note button (mobile-friendly, full width) */}
                  {isChecked && !notesVisible && (
                    <button
                      onClick={() => setState((prev) => ({
                        ...prev,
                        [item.code]: { ...prev[item.code], showNotes: true },
                      }))}
                      className="mt-2 ml-9 w-[calc(100%-2.25rem)] h-9 rounded-[14px] text-xs font-semibold text-[#C58B1B] border border-dashed border-[#C58B1B]/40 hover:bg-[#C58B1B]/5 transition-colors"
                    >
                      + Add Note
                    </button>
                  )}
                </div>

                {/* Photo + Notes section */}
                {(needsPhotos || notesVisible) && (
                  <div className="px-4 pb-4 ml-9 space-y-3 border-t border-[#E5E5E3] pt-3">
                    {/* Photo guidance for cleanup items */}
                    {needsPhotos && item.photoGuidance && (
                      <div className={`rounded-[14px] px-3 py-2 text-[11px] ${
                        item.minPhotos && s.photos.length < item.minPhotos
                          ? 'bg-[#FFF3D6] border border-[#F2D28B] text-[#8F6513]'
                          : 'bg-[#D1FAE5] border border-[#16A34A]/30 text-[#16A34A]'
                      }`}>
                        {item.minPhotos && s.photos.length < item.minPhotos
                          ? `${item.photoGuidance} (${s.photos.length}/${item.minPhotos} attached)`
                          : `All ${item.minPhotos} cleanup photos attached`}
                      </div>
                    )}

                    {needsPhotos && (
                      <PhotoCaptureLocal
                        itemCode={item.code}
                        photos={s.photos}
                        maxPhotos={item.maxPhotos}
                        onPhotosChanged={(p) => updatePhotos(item.code, p)}
                      />
                    )}

                    {notesVisible && (
                      <textarea
                        placeholder={s.result === 'fail' ? 'Notes (describe the issue)...' : 'Add a note...'}
                        value={s.notes}
                        onChange={(e) => updateNotes(item.code, e.target.value)}
                        rows={2}
                        className="w-full text-[15px] text-[#1A1A1A] placeholder:text-[#B0AFA9] border border-[#D1D0CE] rounded-[14px] px-3 py-2 resize-none focus:border-[#C58B1B] focus:outline-none"
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky Submit */}
      <div className="sticky bottom-0 bg-white border-t border-[#D1D0CE] p-4">
        <div className="max-w-[480px] mx-auto">
          {submitError && (
            <div className="mb-2 text-xs text-[#8F6513] bg-[#FFF3D6] border border-[#F2D28B] rounded-[14px] px-3 py-2">
              {submitError}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`
              w-full h-[52px] rounded-[14px] font-semibold text-[15px] transition-colors
              ${canSubmit && !submitting
                ? 'bg-[#C58B1B] text-white hover:bg-[#A67516]'
                : 'bg-[#F5F5F4] text-[#B0AFA9] cursor-not-allowed'}
            `}
          >
            {submitting
              ? 'Uploading photos...'
              : !allChecked
                ? `Check all items (${totalCount - checkedCount} remaining)`
                : cleanupPhotosMissing
                  ? 'Cleanup photos required (see last item)'
                  : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
