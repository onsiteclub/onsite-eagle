'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@onsite/supabase/client'
import {
  getLot,
  GATE_CHECK_TRANSITIONS,
  LOT_STATUS_CONFIG,
} from '@onsite/framing'
import type { FrmLot, GateCheckTransition } from '@onsite/framing'
import AuthGuard from '@/components/AuthGuard'
import TransitionCard from '@/components/TransitionCard'
import DeleteLotButton from '@/components/DeleteLotButton'
import { fetchLatestGateCheckForLot, type GateCheckData } from '@/lib/data/gate-checks'

interface GateCheckEntry {
  transition: GateCheckTransition
  gateCheck: GateCheckData | null
}

export default function LotDetailPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-[15px] text-[#888884]">Loading...</div>}>
      <AuthGuard>
        {(user) => <LotDetailContent userId={user.id} />}
      </AuthGuard>
    </Suspense>
  )
}

function LotDetailContent({ userId }: { userId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const lotId = searchParams.get('id')

  const [lot, setLot] = useState<FrmLot | null>(null)
  const [jobsiteName, setJobsiteName] = useState<string | null>(null)
  const [gateChecks, setGateChecks] = useState<GateCheckEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lotId) {
      router.replace('/app')
      return
    }

    const supabase = createClient()
    let cancelled = false

    async function load() {
      try {
        const lotData = await getLot(supabase, lotId!)
        if (cancelled) return
        setLot(lotData)

        if (lotData.jobsite_id) {
          const { data: jobsite } = await supabase
            .from('frm_jobsites')
            .select('name')
            .eq('id', lotData.jobsite_id)
            .single()
          if (cancelled) return
          setJobsiteName(jobsite?.name ?? null)
        }

        const checks = await Promise.all(
          GATE_CHECK_TRANSITIONS.map(async (transition) => ({
            transition,
            gateCheck: await fetchLatestGateCheckForLot(lotId!, transition),
          })),
        )
        if (cancelled) return
        setGateChecks(checks)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load lot:', err)
        if (cancelled) return
        setError('Failed to load lot')
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [lotId, router])

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-[15px] text-[#DC2626]">{error}</p>
        <Link href="/app" className="text-[13px] text-[#C58B1B] mt-4 inline-block">
          &larr; Back to lots
        </Link>
      </div>
    )
  }

  if (loading || !lot) {
    return <div className="py-8 text-center text-[15px] text-[#888884]">Loading lot...</div>
  }

  const statusCfg = LOT_STATUS_CONFIG[lot.status]

  return (
    <div className="space-y-4">
      <Link href="/app" className="text-[13px] text-[#C58B1B] hover:underline">
        &larr; Back to lots
      </Link>

      <div className="bg-white rounded-[14px] border border-[#D1D0CE] p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1A1A1A]">Lot {lot.lot_number}</h1>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: statusCfg.color + '20', color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
        </div>
        {lot.address && <p className="text-[15px] text-[#888884] mt-1">{lot.address}</p>}
        {lot.current_phase && (
          <p className="text-xs text-[#888884] mt-2">
            Current phase:{' '}
            <span className="font-medium text-[#1A1A1A]">
              {lot.current_phase.replace(/_/g, ' ')}
            </span>
          </p>
        )}
      </div>

      <DeleteLotButton lotId={lot.id} lotNumber={lot.lot_number} />

      <div>
        <h2 className="text-[15px] font-semibold text-[#1A1A1A] mb-2">Gate Checks</h2>
        <div className="space-y-2">
          {gateChecks.map(({ transition, gateCheck }) => (
            <TransitionCard
              key={transition}
              lotId={lot.id}
              lotNumber={lot.lot_number}
              lotAddress={lot.address}
              jobsiteName={jobsiteName}
              transition={transition}
              gateCheck={gateCheck}
              userId={userId}
              organizationId={lot.organization_id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
