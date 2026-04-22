'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TRANSITION_LABELS } from '@onsite/framing'
import type { GateCheckResult, GateCheckTransition } from '@onsite/framing'
import AuthGuard from '@/components/AuthGuard'
import ChecklistItem from '@/components/ChecklistItem'
import ProgressBar from '@/components/ProgressBar'
import {
  fetchGateCheck,
  submitGateCheck,
  updateItemResult,
  removeItemPhoto,
  type GateCheckData,
  type GateCheckItemData,
} from '@/lib/data/gate-checks'
import { hapticSuccess, hapticError } from '@/lib/native/haptics'

export default function ChecklistPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-[15px] text-[#888884]">Loading checklist...</div>}>
      <AuthGuard>
        {() => <ChecklistContent />}
      </AuthGuard>
    </Suspense>
  )
}

function ChecklistContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const lotId = searchParams.get('lotId') ?? ''
  const transition = (searchParams.get('t') ?? 'framing_to_roofing') as GateCheckTransition
  const gcId = searchParams.get('gcId')

  const [gateCheck, setGateCheck] = useState<GateCheckData | null>(null)
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!gcId) return
    try {
      const gc = await fetchGateCheck(gcId)
      setGateCheck(gc)
    } catch (err) {
      console.error('Failed to load gate check:', err)
      setError('Failed to load checklist')
    }
  }, [gcId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const items = gateCheck?.items ?? []
  const checked = items.filter(i => i.result !== 'pending').length
  const total = items.length
  const allChecked = checked === total && total > 0

  function patchItem(itemId: string, patch: Partial<GateCheckItemData>) {
    setGateCheck(prev => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map(i => (i.id === itemId ? { ...i, ...patch } : i)),
      }
    })
  }

  function startSaving(itemId: string) {
    setSavingItems(prev => new Set(prev).add(itemId))
  }

  function stopSaving(itemId: string) {
    setSavingItems(prev => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  async function handleResultChange(itemId: string, result: GateCheckResult) {
    startSaving(itemId)
    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return
      await updateItemResult({
        itemId,
        result,
        notes: item.notes,
        photoUrl: item.photoUrl,
      })
      patchItem(itemId, { result })
    } catch (err) {
      console.error('Failed to update item:', err)
    } finally {
      stopSaving(itemId)
    }
  }

  async function handleNotesChange(itemId: string, notes: string) {
    const item = items.find(i => i.id === itemId)
    if (!item || item.result === 'pending') return
    startSaving(itemId)
    try {
      await updateItemResult({
        itemId,
        result: item.result,
        notes: notes || null,
        photoUrl: item.photoUrl,
      })
      patchItem(itemId, { notes: notes || null })
    } catch (err) {
      console.error('Failed to update notes:', err)
    } finally {
      stopSaving(itemId)
    }
  }

  function handlePhotoUploaded(itemId: string, url: string) {
    // PhotoCapture já chamou addItemPhoto() que persistiu tudo.
    // Aqui só refletimos no estado local — o result pode ter mudado pra 'fail'
    // se estava 'pending'.
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const newResult: GateCheckResult = item.result === 'pending' ? 'fail' : item.result
    patchItem(itemId, { photoUrl: url, result: newResult })
  }

  async function handlePhotoRemoved(itemId: string) {
    const item = items.find(i => i.id === itemId)
    if (!item || item.result === 'pending') return
    startSaving(itemId)
    try {
      await removeItemPhoto(itemId, item.result, item.notes)
      patchItem(itemId, { photoUrl: null })
    } catch (err) {
      console.error('Failed to remove photo:', err)
    } finally {
      stopSaving(itemId)
    }
  }

  async function handleSubmit() {
    if (!gateCheck || !allChecked || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await submitGateCheck(gateCheck.id)
      void hapticSuccess()
      router.push(
        `/app/check/complete?lotId=${lotId}&t=${transition}&gcId=${gateCheck.id}`,
      )
    } catch (err) {
      console.error('Failed to complete gate check:', err)
      void hapticError()
      setError(err instanceof Error ? err.message : 'Failed to submit')
      setSubmitting(false)
    }
  }

  if (error && !gateCheck) {
    return (
      <div className="py-8 text-center">
        <p className="text-[15px] text-[#DC2626]">{error}</p>
        <Link href={`/app/lot?id=${lotId}`} className="text-[13px] text-[#C58B1B] mt-4 inline-block">
          &larr; Back to lot
        </Link>
      </div>
    )
  }

  if (!gateCheck) {
    return <div className="py-8 text-center text-[15px] text-[#888884]">Loading checklist...</div>
  }

  const label = TRANSITION_LABELS[transition] ?? transition

  return (
    <div className="pb-24">
      <div className="sticky top-[57px] z-40 bg-[#F5F5F4] pb-3 pt-1">
        <div className="flex items-center justify-between mb-2">
          <Link href={`/app/lot?id=${lotId}`} className="text-[13px] text-[#C58B1B]">
            &larr; Back
          </Link>
          <span className="text-xs text-[#888884] font-medium">
            {checked}/{total} checked
          </span>
        </div>
        <h1 className="text-lg font-bold text-[#1A1A1A] mb-2">{label}</h1>
        <ProgressBar checked={checked} total={total} />
      </div>

      <div className="space-y-3 mt-4">
        {items.map((item, idx) => (
          <ChecklistItem
            key={item.id}
            index={idx}
            item={{
              id: item.id,
              item_code: item.itemCode,
              item_label: item.itemLabel,
              result: item.result,
              notes: item.notes,
              photo_url: item.photoUrl,
            }}
            isBlocking={item.isBlocking}
            gateCheckId={gateCheck.id}
            saving={savingItems.has(item.id)}
            onResultChange={handleResultChange}
            onNotesChange={handleNotesChange}
            onPhotoUploaded={handlePhotoUploaded}
            onPhotoRemoved={handlePhotoRemoved}
          />
        ))}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-[rgba(220,38,38,0.12)] border border-[#DC2626]/30 rounded-[14px] text-[15px] text-[#DC2626]">
          {error}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D1D0CE] p-4 z-50">
        <div className="max-w-[480px] mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!allChecked || submitting}
            className={`
              w-full h-[52px] rounded-[14px] font-semibold text-[15px] transition-all
              ${allChecked
                ? 'bg-[#C58B1B] text-white hover:bg-[#A67516]'
                : 'bg-[#F5F5F4] text-[#B0AFA9] cursor-not-allowed'}
            `}
          >
            {submitting
              ? 'Submitting...'
              : allChecked
                ? 'Submit Gate Check'
                : `${total - checked} items remaining`}
          </button>
        </div>
      </div>
    </div>
  )
}
