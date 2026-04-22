'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TRANSITION_LABELS } from '@onsite/framing'
import type { GateCheckTransition } from '@onsite/framing'
import AuthGuard from '@/components/AuthGuard'
import { fetchGateCheck, type GateCheckData } from '@/lib/data/gate-checks'

export default function CompletePage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-[15px] text-[#888884]">Loading...</div>}>
      <AuthGuard>
        {() => <CompleteContent />}
      </AuthGuard>
    </Suspense>
  )
}

function CompleteContent() {
  const searchParams = useSearchParams()

  const lotId = searchParams.get('lotId') ?? ''
  const transition = (searchParams.get('t') ?? 'framing_to_roofing') as GateCheckTransition
  const gcId = searchParams.get('gcId')

  const [gateCheck, setGateCheck] = useState<GateCheckData | null>(null)

  useEffect(() => {
    if (!gcId) return
    fetchGateCheck(gcId).then(setGateCheck).catch((err) => {
      console.error('Failed to load gate check:', err)
    })
  }, [gcId])

  if (!gateCheck) {
    return <div className="py-8 text-center text-[15px] text-[#888884]">Loading...</div>
  }

  const items = gateCheck.items
  const passed = items.filter((i) => i.result === 'pass').length
  const failed = items.filter((i) => i.result === 'fail').length
  const na = items.filter((i) => i.result === 'na').length
  const failedItems = items.filter((i) => i.result === 'fail')
  const isPassed = gateCheck.status === 'passed'
  const label = TRANSITION_LABELS[transition] ?? transition

  return (
    <div className="space-y-4">
      <div
        className={`
          rounded-[14px] p-6 text-center
          ${isPassed ? 'bg-[#D1FAE5] border border-[#16A34A]/30' : 'bg-[rgba(220,38,38,0.12)] border border-[#DC2626]/30'}
        `}
      >
        <div className={`text-4xl mb-2 ${isPassed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          {isPassed ? '✓' : '✗'}
        </div>
        <h1 className={`text-xl font-bold ${isPassed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          {isPassed ? 'PASSED' : 'FAILED'}
        </h1>
        <p className="text-[15px] text-[#888884] mt-1">{label}</p>
      </div>

      <div className="bg-white rounded-[14px] border border-[#D1D0CE] p-4">
        <h2 className="text-[15px] font-semibold text-[#1A1A1A] mb-3">Summary</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <span className="text-2xl font-bold text-[#16A34A]">{passed}</span>
            <p className="text-xs text-[#888884]">Passed</p>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold text-[#DC2626]">{failed}</span>
            <p className="text-xs text-[#888884]">Failed</p>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold text-[#B0AFA9]">{na}</span>
            <p className="text-xs text-[#888884]">N/A</p>
          </div>
        </div>
      </div>

      {failedItems.length > 0 && (
        <div className="bg-white rounded-[14px] border border-[#D1D0CE] p-4">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A] mb-3">Failed Items</h2>
          <div className="space-y-2">
            {failedItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-[15px]">
                <span className="text-[#DC2626] mt-0.5">&#10005;</span>
                <div className="flex-1">
                  <p className="text-[#1A1A1A]">{item.itemLabel}</p>
                  {item.isBlocking && (
                    <span className="text-[10px] font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.12)] px-1.5 py-0.5 rounded">
                      BLOCKING
                    </span>
                  )}
                  {item.notes && (
                    <p className="text-xs text-[#888884] mt-0.5">{item.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Link
          href={`/app/lot?id=${lotId}`}
          className="block w-full h-[52px] rounded-[14px] bg-[#C58B1B] text-white font-semibold text-[15px] text-center leading-[52px] hover:bg-[#A67516] transition-colors"
        >
          Back to Lot
        </Link>
        <Link
          href="/app"
          className="block w-full h-[52px] rounded-[14px] bg-white border border-[#D1D0CE] text-[#888884] font-semibold text-[15px] text-center leading-[52px] hover:border-brand-500 hover:text-[#C58B1B] transition-colors"
        >
          Select Another Lot
        </Link>
      </div>
    </div>
  )
}
