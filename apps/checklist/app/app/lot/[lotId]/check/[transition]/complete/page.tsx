'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import { getGateCheck, getTemplateItems, TRANSITION_LABELS } from '@onsite/framing'
import type { FrmGateCheck, FrmGateCheckItem, FrmGateCheckTemplate, GateCheckTransition } from '@onsite/framing'
import Link from 'next/link'

interface Props {
  params: Promise<{ lotId: string; transition: string }>
}

export default function CompletePage({ params }: Props) {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [lotId, setLotId] = useState('')
  const [transition, setTransition] = useState<GateCheckTransition>('framing_to_roofing')
  const [gateCheck, setGateCheck] = useState<(FrmGateCheck & { items: FrmGateCheckItem[] }) | null>(null)
  const [templates, setTemplates] = useState<FrmGateCheckTemplate[]>([])

  const gcId = searchParams.get('gcId')

  useEffect(() => {
    params.then(({ lotId: lid, transition: tr }) => {
      setLotId(lid)
      setTransition(tr as GateCheckTransition)
    })
  }, [params])

  useEffect(() => {
    if (!gcId || !transition) return
    Promise.all([
      getGateCheck(supabase, gcId),
      getTemplateItems(supabase, transition),
    ]).then(([gc, tmpl]) => {
      setGateCheck(gc)
      setTemplates(tmpl)
    })
  }, [gcId, transition, supabase])

  if (!gateCheck) {
    return <div className="py-8 text-center text-[15px] text-[#888884]">Loading...</div>
  }

  const items = gateCheck.items
  const passed = items.filter(i => i.result === 'pass').length
  const failed = items.filter(i => i.result === 'fail').length
  const na = items.filter(i => i.result === 'na').length
  const blockingCodes = new Set(templates.filter(t => t.is_blocking).map(t => t.item_code))
  const failedItems = items.filter(i => i.result === 'fail')
  const isPassed = gateCheck.status === 'passed'
  const label = TRANSITION_LABELS[transition] ?? transition

  return (
    <div className="space-y-4">
      {/* Result Banner */}
      <div className={`
        rounded-[14px] p-6 text-center
        ${isPassed ? 'bg-[#D1FAE5] border border-[#16A34A]/30' : 'bg-[rgba(220,38,38,0.12)] border border-[#DC2626]/30'}
      `}>
        <div className={`text-4xl mb-2 ${isPassed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          {isPassed ? '\u2713' : '\u2717'}
        </div>
        <h1 className={`text-xl font-bold ${isPassed ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          {isPassed ? 'PASSED' : 'FAILED'}
        </h1>
        <p className="text-[15px] text-[#888884] mt-1">{label}</p>
      </div>

      {/* Summary */}
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

      {/* Failed Items */}
      {failedItems.length > 0 && (
        <div className="bg-white rounded-[14px] border border-[#D1D0CE] p-4">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A] mb-3">Failed Items</h2>
          <div className="space-y-2">
            {failedItems.map(item => (
              <div key={item.id} className="flex items-start gap-2 text-[15px]">
                <span className="text-[#DC2626] mt-0.5">&#10005;</span>
                <div className="flex-1">
                  <p className="text-[#1A1A1A]">{item.item_label}</p>
                  {blockingCodes.has(item.item_code) && (
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

      {/* Actions */}
      <div className="space-y-2">
        <Link
          href={`/app/lot/${lotId}`}
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
