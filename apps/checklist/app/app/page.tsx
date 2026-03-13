import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { listJobsites } from '@onsite/framing'
import LotSearchClient from './LotSearchClient'

export const metadata = { title: 'Select Lot' }

export default async function AppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const jobsites = await listJobsites(supabase)

  return <LotSearchClient jobsites={jobsites} />
}
