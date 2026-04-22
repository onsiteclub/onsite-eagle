'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRANSITION_LABELS } from '@onsite/framing'
import type { GateCheckTransition } from '@onsite/framing'
import { startNewGateCheck, type GateCheckData } from '@/lib/data/gate-checks'

interface Props {
  lotId: string
  lotNumber?: string | null
  lotAddress?: string | null
  jobsiteName?: string | null
  transition: GateCheckTransition
  gateCheck: GateCheckData | null
  userId: string
  organizationId: string | null
}

export default function TransitionCard({
  lotId,
  lotNumber,
  lotAddress,
  jobsiteName,
  transition,
  gateCheck,
  userId,
  organizationId,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const label = TRANSITION_LABELS[transition]
  const status = gateCheck?.status ?? null
  const items = gateCheck?.items ?? []
  const checked = items.filter(i => i.result !== 'pending').length
  const total = items.length

  const statusColor =
    status === 'passed' ? '#16A34A' : status === 'failed' ? '#DC2626' : '#C58B1B'
  const statusLabel =
    status === 'passed'
      ? 'Passed'
      : status === 'failed'
      ? 'Failed'
      : status === 'in_progress'
      ? `In Progress (${checked}/${total})`
      : 'Not Started'

  async function handleTap() {
    if (loading) return

    if (status === 'in_progress' && gateCheck) {
      router.push(`/app/check?lotId=${lotId}&t=${transition}&gcId=${gateCheck.id}`)
      return
    }

    if (status === 'passed' || status === 'failed') {
      router.push(`/app/check/complete?lotId=${lotId}&t=${transition}&gcId=${gateCheck!.id}`)
      return
    }

    setLoading(true)
    try {
      const newGc = await startNewGateCheck({
        lotId,
        lotNumber,
        lotAddress,
        jobsiteName,
        organizationId,
        transition,
        userId,
      })
      router.push(`/app/check?lotId=${lotId}&t=${transition}&gcId=${newGc.id}`)
    } catch (err) {
      console.error('Failed to start gate check:', err)
      setLoading(false)
    }
  }

  const ctaLabel =
    status === 'in_progress' ? 'Continue' : status === 'passed' || status === 'failed' ? 'View' : 'Start'

  return (
    <button
      onClick={handleTap}
      disabled={loading}
      className="w-full text-left bg-white rounded-[14px] border border-[#D1D0CE] p-4 hover:border-brand-500 transition-colors disabled:opacity-50"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#1A1A1A] text-[15px]">{label}</span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: status ? statusColor + '20' : '#E5E5E3',
            color: status ? statusColor : '#B0AFA9',
          }}
        >
          {loading ? 'Starting...' : statusLabel}
        </span>
      </div>

      {status === 'in_progress' && total > 0 && (
        <div className="mt-3">
          <div className="w-full bg-[#E5E5E3] rounded-full h-1.5">
            <div
              className="bg-brand-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(checked / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[#888884]">
          {total > 0 ? `${total} items` : 'Template required'}
        </span>
        <span className="text-xs font-medium text-brand-500">{ctaLabel} &rarr;</span>
      </div>
    </button>
  )
}
