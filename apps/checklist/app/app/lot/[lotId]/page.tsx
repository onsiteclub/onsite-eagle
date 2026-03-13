import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { getLot, getLatestGateCheck, GATE_CHECK_TRANSITIONS, TRANSITION_LABELS, LOT_STATUS_CONFIG } from '@onsite/framing'
import type { GateCheckTransition } from '@onsite/framing'
import TransitionCard from '@/components/TransitionCard'
import Link from 'next/link'

export const metadata = { title: 'Lot Detail' }

interface Props {
  params: Promise<{ lotId: string }>
}

export default async function LotDetailPage({ params }: Props) {
  const { lotId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const lot = await getLot(supabase, lotId)
  const statusCfg = LOT_STATUS_CONFIG[lot.status]

  // Load latest gate check for each transition
  const gateChecks = await Promise.all(
    GATE_CHECK_TRANSITIONS.map(async (transition) => {
      const gc = await getLatestGateCheck(supabase, lotId, transition)
      return { transition, gateCheck: gc }
    })
  )

  return (
    <div className="space-y-4">
      {/* Back */}
      <Link href="/app" className="text-sm text-brand-500 hover:underline">&larr; Back to lots</Link>

      {/* Lot Info */}
      <div className="bg-white rounded-[14px] border border-[#E5E7EB] p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#101828]">Lot {lot.lot_number}</h1>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: statusCfg.color + '20', color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
        </div>
        {lot.address && <p className="text-sm text-[#667085] mt-1">{lot.address}</p>}
        {lot.current_phase && (
          <p className="text-xs text-[#667085] mt-2">
            Current phase: <span className="font-medium text-[#101828]">{lot.current_phase.replace(/_/g, ' ')}</span>
          </p>
        )}
      </div>

      {/* Gate Checks */}
      <div>
        <h2 className="text-sm font-semibold text-[#101828] mb-2">Gate Checks</h2>
        <div className="space-y-2">
          {gateChecks.map(({ transition, gateCheck }) => (
            <TransitionCard
              key={transition}
              lotId={lotId}
              transition={transition}
              gateCheck={gateCheck}
              userId={user.id}
              organizationId={lot.organization_id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
