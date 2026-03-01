import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { listJobsites } from '@onsite/framing'
import { JobsitesList } from '@/components/framing/JobsitesList'

export const metadata = { title: 'Jobsites | Framing | OnSite Club' }

export default async function JobsitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const jobsites = await listJobsites(supabase).catch(() => [])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <JobsitesList initialJobsites={jobsites} />
    </div>
  )
}
