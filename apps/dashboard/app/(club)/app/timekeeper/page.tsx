import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import TimekeeperDashboard from '@/components/timekeeper/TimekeeperDashboard'
import type { ProfileWithSubscription } from '@/lib/supabase/types'

export const metadata = { title: 'Timekeeper | OnSite Club' }

export default async function TimekeeperAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: coreProfile } = await supabase
    .from('core_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!coreProfile) redirect('/')

  const { data: subscription } = await supabase
    .from('bil_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('app_name', 'timekeeper')
    .single()

  const profile: ProfileWithSubscription = {
    ...coreProfile,
    subscription_status: subscription?.status ?? 'none',
    trial_ends_at: subscription?.trial_end ?? null,
    has_payment_method: subscription?.has_payment_method ?? false,
  }

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [{ data: entries }, { data: geofences }] = await Promise.all([
    supabase
      .from('tmk_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('entry_at', ninetyDaysAgo.toISOString())
      .order('entry_at', { ascending: false }),
    supabase
      .from('tmk_geofences')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name'),
  ])

  return (
    <TimekeeperDashboard
      profile={profile}
      entries={entries || []}
      geofences={geofences || []}
    />
  )
}
