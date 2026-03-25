import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { listJobsites, listCrews, listPaymentsByJobsite, getPaymentSummary, getHoldbackSummary } from '@onsite/framing'
import PaymentsClient from './PaymentsClient'

export const metadata = { title: 'Payments | Framing | OnSite Club' }

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [jobsites, crewsRaw] = await Promise.all([
    listJobsites(supabase).catch(() => []),
    listCrews(supabase).catch(() => []),
  ])

  // Flatten crews to just { id, name } for the filter
  const crews = crewsRaw.map(c => ({ id: c.id, name: c.name }))

  // Fetch payments, summaries, and holdback summaries for all jobsites in parallel
  const [paymentsArrays, summaries, holdbackSummaries] = await Promise.all([
    Promise.all(
      jobsites.map(j => listPaymentsByJobsite(supabase, j.id).catch(() => [])),
    ),
    Promise.all(
      jobsites.map(j =>
        getPaymentSummary(supabase, j.id).catch(() => ({
          total_count: 0,
          unpaid: { count: 0, amount: 0 },
          pending: { count: 0, amount: 0 },
          approved: { count: 0, amount: 0 },
          paid: { count: 0, amount: 0 },
          total_amount: 0,
        })),
      ),
    ),
    Promise.all(
      jobsites.map(j =>
        getHoldbackSummary(supabase, j.id).catch(() => ({
          held: { count: 0, amount: 0 },
          released: { count: 0, amount: 0 },
          reassigned: { count: 0, amount: 0 },
          total_holdback: 0,
        })),
      ),
    ),
  ])

  // Merge all payments into a single array
  const allPayments = paymentsArrays.flat()

  // Build summaries record keyed by jobsite id
  const summariesRecord: Record<string, Awaited<ReturnType<typeof getPaymentSummary>>> = {}
  jobsites.forEach((j, i) => {
    summariesRecord[j.id] = summaries[i]
  })

  // Aggregate holdback summary across all jobsites
  const aggregateHoldback = holdbackSummaries.reduce(
    (acc, s) => ({
      held: { count: acc.held.count + s.held.count, amount: acc.held.amount + s.held.amount },
      released: { count: acc.released.count + s.released.count, amount: acc.released.amount + s.released.amount },
      reassigned: { count: acc.reassigned.count + s.reassigned.count, amount: acc.reassigned.amount + s.reassigned.amount },
      total_holdback: acc.total_holdback + s.total_holdback,
    }),
    { held: { count: 0, amount: 0 }, released: { count: 0, amount: 0 }, reassigned: { count: 0, amount: 0 }, total_holdback: 0 },
  )

  // Get lot IDs where backframe_to_final gate check has passed (holdback eligible)
  const { data: passedGateChecks } = await supabase
    .from('frm_gate_checks')
    .select('lot_id')
    .eq('transition', 'backframe_to_final')
    .eq('status', 'passed')

  const holdbackEligibleLots = new Set((passedGateChecks ?? []).map((gc: { lot_id: string }) => gc.lot_id))

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      <PaymentsClient
        initialPayments={allPayments}
        initialSummaries={summariesRecord}
        holdbackSummary={aggregateHoldback}
        holdbackEligibleLots={Array.from(holdbackEligibleLots)}
        jobsites={jobsites}
        crews={crews}
        userId={user.id}
      />
    </div>
  )
}
