import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { listCrews } from '@onsite/framing'
import CrewsList from '@/components/framing/CrewsList'

export const metadata = { title: 'Crews | Framing | OnSite Club' }

export default async function CrewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const crews = await listCrews(supabase)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CrewsList initialCrews={crews} />
    </div>
  )
}
