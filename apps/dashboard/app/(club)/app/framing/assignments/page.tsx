import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import {
  listJobsites,
  listLots,
  listCrews,
  listAssignmentsByJobsite,
  FRAMING_PHASES,
} from '@onsite/framing'
import AssignmentMatrix from '@/components/framing/AssignmentMatrix'

export const metadata = { title: 'Assignments | Framing | OnSite Club' }

export default async function AssignmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const jobsites = await listJobsites(supabase)
  const crews = await listCrews(supabase)

  // Pre-load lots and assignments for the first jobsite
  let initialLots: Awaited<ReturnType<typeof listLots>> = []
  let initialAssignments: Awaited<ReturnType<typeof listAssignmentsByJobsite>> = []

  if (jobsites.length > 0) {
    const firstId = jobsites[0].id
    ;[initialLots, initialAssignments] = await Promise.all([
      listLots(supabase, firstId),
      listAssignmentsByJobsite(supabase, firstId),
    ])
  }

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      <AssignmentMatrix
        jobsites={jobsites}
        initialLots={initialLots}
        initialAssignments={initialAssignments}
        crews={crews}
        phases={FRAMING_PHASES}
      />
    </div>
  )
}
