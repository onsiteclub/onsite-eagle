import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { getLot, getLatestGateCheck, GATE_CHECK_TRANSITIONS, TRANSITION_LABELS, LOT_STATUS_CONFIG } from '@onsite/framing'
import type { GateCheckTransition } from '@onsite/framing'
import TransitionCard from '@/components/TransitionCard'
import DeleteLotButton from '@/components/DeleteLotButton'
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
      <Link href="/app" className="text-[13px] text-[#C58B1B] hover:underline">&larr; Back to lots</Link>

      {/* Lot Info */}
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
            Current phase: <span className="font-medium text-[#1A1A1A]">{lot.current_phase.replace(/_/g, ' ')}</span>
          </p>
        )}
      </div>

      {/* Delete (temporary — testing phase) */}
      <DeleteLotButton lotId={lotId} lotNumber={lot.lot_number} />

      {/* Gate Checks */}
      <div>
        <h2 className="text-[15px] font-semibold text-[#1A1A1A] mb-2">Gate Checks</h2>
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
