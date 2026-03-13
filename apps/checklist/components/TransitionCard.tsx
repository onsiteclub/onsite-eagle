'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import { startGateCheck, TRANSITION_LABELS } from '@onsite/framing'
import type { FrmGateCheck, FrmGateCheckItem, GateCheckTransition } from '@onsite/framing'
import { useState } from 'react'

interface Props {
  lotId: string
  transition: GateCheckTransition
  gateCheck: (FrmGateCheck & { items: FrmGateCheckItem[] }) | null
  userId: string
  organizationId: string | null
}

export default function TransitionCard({ lotId, transition, gateCheck, userId, organizationId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const label = TRANSITION_LABELS[transition]
  const status = gateCheck?.status ?? null
  const items = gateCheck?.items ?? []
  const checked = items.filter(i => i.result !== 'pending').length
  const total = items.length

  const statusColor = status === 'passed' ? '#059669' : status === 'failed' ? '#DC2626' : '#FF9500'
  const statusLabel = status === 'passed' ? 'Passed' : status === 'failed' ? 'Failed' : status === 'in_progress' ? `In Progress (${checked}/${total})` : 'Not Started'

  async function handleTap() {
    if (loading) return

    if (status === 'in_progress' && gateCheck) {
      router.push(`/app/lot/${lotId}/check/${transition}?gcId=${gateCheck.id}`)
      return
    }

    if (status === 'passed' || status === 'failed') {
      router.push(`/app/lot/${lotId}/check/${transition}/complete?gcId=${gateCheck!.id}`)
      return
    }

    // Start new gate check
    setLoading(true)
    try {
      const { gateCheck: newGc } = await startGateCheck(supabase, lotId, transition, userId, organizationId ?? undefined)
      router.push(`/app/lot/${lotId}/check/${transition}?gcId=${newGc.id}`)
    } catch (err) {
      console.error('Failed to start gate check:', err)
      setLoading(false)
    }
  }

  const ctaLabel = status === 'in_progress' ? 'Continue' : status === 'passed' || status === 'failed' ? 'View' : 'Start'

  return (
    <button
      onClick={handleTap}
      disabled={loading}
      className="w-full text-left bg-white rounded-[14px] border border-[#E5E7EB] p-4 hover:border-brand-500 transition-colors disabled:opacity-50"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#101828] text-sm">{label}</span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: status ? statusColor + '20' : '#F3F4F6', color: status ? statusColor : '#9CA3AF' }}
        >
          {loading ? 'Starting...' : statusLabel}
        </span>
      </div>

      {status === 'in_progress' && total > 0 && (
        <div className="mt-3">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-brand-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(checked / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[#667085]">
          {total > 0 ? `${total} items` : 'Template required'}
        </span>
        <span className="text-xs font-medium text-brand-500">{ctaLabel} &rarr;</span>
      </div>
    </button>
  )
}
