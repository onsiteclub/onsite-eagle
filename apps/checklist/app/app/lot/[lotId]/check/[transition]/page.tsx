'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import {
  getGateCheck,
  getTemplateItems,
  updateGateCheckItem,
  completeGateCheck,
  TRANSITION_LABELS,
} from '@onsite/framing'
import type { FrmGateCheck, FrmGateCheckItem, FrmGateCheckTemplate, GateCheckResult, GateCheckTransition } from '@onsite/framing'
import ChecklistItem from '@/components/ChecklistItem'
import ProgressBar from '@/components/ProgressBar'
import Link from 'next/link'

interface Props {
  params: Promise<{ lotId: string; transition: string }>
}

export default function ChecklistPage({ params }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [lotId, setLotId] = useState('')
  const [transition, setTransition] = useState<GateCheckTransition>('framing_to_roofing')
  const [gateCheck, setGateCheck] = useState<(FrmGateCheck & { items: FrmGateCheckItem[] }) | null>(null)
  const [templates, setTemplates] = useState<FrmGateCheckTemplate[]>([])
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resolve params
  useEffect(() => {
    params.then(({ lotId: lid, transition: tr }) => {
      setLotId(lid)
      setTransition(tr as GateCheckTransition)
    })
  }, [params])

  // Load gate check data
  const gcId = searchParams.get('gcId')

  const loadData = useCallback(async () => {
    if (!gcId || !transition) return
    try {
      const [gc, tmpl] = await Promise.all([
        getGateCheck(supabase, gcId),
        getTemplateItems(supabase, transition),
      ])
      setGateCheck(gc)
      setTemplates(tmpl)
    } catch (err) {
      console.error('Failed to load gate check:', err)
      setError('Failed to load checklist')
    }
  }, [gcId, transition, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Build blocking lookup from templates
  const blockingCodes = new Set(templates.filter(t => t.is_blocking).map(t => t.item_code))

  const items = gateCheck?.items ?? []
  const checked = items.filter(i => i.result !== 'pending').length
  const total = items.length
  const allChecked = checked === total && total > 0

  async function handleResultChange(itemId: string, result: GateCheckResult) {
    setSavingItems(prev => new Set(prev).add(itemId))
    try {
      const item = items.find(i => i.id === itemId)
      const updated = await updateGateCheckItem(supabase, itemId, result, item?.photo_url ?? undefined, item?.notes ?? undefined)
      setGateCheck(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(i => i.id === itemId ? updated : i),
        }
      })
    } catch (err) {
      console.error('Failed to update item:', err)
    } finally {
      setSavingItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  async function handleNotesChange(itemId: string, notes: string) {
    const item = items.find(i => i.id === itemId)
    if (!item || item.result === 'pending') return
    setSavingItems(prev => new Set(prev).add(itemId))
    try {
      const updated = await updateGateCheckItem(supabase, itemId, item.result, item.photo_url ?? undefined, notes || undefined)
      setGateCheck(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(i => i.id === itemId ? updated : i),
        }
      })
    } catch (err) {
      console.error('Failed to update notes:', err)
    } finally {
      setSavingItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  async function handlePhotoUploaded(itemId: string, url: string) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const result = item.result === 'pending' ? 'fail' : item.result
    setSavingItems(prev => new Set(prev).add(itemId))
    try {
      const updated = await updateGateCheckItem(supabase, itemId, result, url, item.notes ?? undefined)
      setGateCheck(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(i => i.id === itemId ? updated : i),
        }
      })
    } catch (err) {
      console.error('Failed to save photo:', err)
    } finally {
      setSavingItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  async function handlePhotoRemoved(itemId: string) {
    const item = items.find(i => i.id === itemId)
    if (!item || item.result === 'pending') return
    setSavingItems(prev => new Set(prev).add(itemId))
    try {
      const updated = await updateGateCheckItem(supabase, itemId, item.result, undefined, item.notes ?? undefined)
      setGateCheck(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(i => i.id === itemId ? updated : i),
        }
      })
    } catch (err) {
      console.error('Failed to remove photo:', err)
    } finally {
      setSavingItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  async function handleSubmit() {
    if (!gateCheck || !allChecked || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await completeGateCheck(supabase, gateCheck.id)
      router.push(`/app/lot/${lotId}/check/${transition}/complete?gcId=${gateCheck.id}`)
    } catch (err) {
      console.error('Failed to complete gate check:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit')
      setSubmitting(false)
    }
  }

  if (error && !gateCheck) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[#DC2626]">{error}</p>
        <Link href={`/app/lot/${lotId}`} className="text-sm text-brand-500 mt-4 inline-block">
          &larr; Back to lot
        </Link>
      </div>
    )
  }

  if (!gateCheck) {
    return <div className="py-8 text-center text-sm text-[#667085]">Loading checklist...</div>
  }

  const label = TRANSITION_LABELS[transition] ?? transition

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-[57px] z-40 bg-[#F6F7F9] pb-3 pt-1">
        <div className="flex items-center justify-between mb-2">
          <Link href={`/app/lot/${lotId}`} className="text-sm text-brand-500">&larr; Back</Link>
          <span className="text-xs text-[#667085] font-medium">{checked}/{total} checked</span>
        </div>
        <h1 className="text-lg font-bold text-[#101828] mb-2">{label}</h1>
        <ProgressBar checked={checked} total={total} />
      </div>

      {/* Items */}
      <div className="space-y-3 mt-4">
        {items.map((item, idx) => (
          <ChecklistItem
            key={item.id}
            index={idx}
            item={item}
            isBlocking={blockingCodes.has(item.item_code)}
            gateCheckId={gateCheck.id}
            saving={savingItems.has(item.id)}
            onResultChange={handleResultChange}
            onNotesChange={handleNotesChange}
            onPhotoUploaded={handlePhotoUploaded}
            onPhotoRemoved={handlePhotoRemoved}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] p-4 z-50">
        <div className="max-w-[480px] mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!allChecked || submitting}
            className={`
              w-full h-12 rounded-[10px] font-semibold text-sm transition-all
              ${allChecked
                ? 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700'
                : 'bg-gray-100 text-[#9CA3AF] cursor-not-allowed'}
            `}
          >
            {submitting ? 'Submitting...' : allChecked ? 'Submit Gate Check' : `${total - checked} items remaining`}
          </button>
        </div>
      </div>
    </div>
  )
}
