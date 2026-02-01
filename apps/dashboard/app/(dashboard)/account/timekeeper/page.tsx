import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import TimekeeperDashboard from './TimekeeperDashboard'
import type { TimekeeperEntry, TimekeeperGeofence, ProfileWithSubscription } from '@/lib/supabase/types'

export const metadata = {
  title: 'Timekeeper | OnSite Club',
}

export default async function TimekeeperPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch profile from core_profiles
  const { data: coreProfile } = await supabase
    .from('core_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!coreProfile) redirect('/')

  // Fetch subscription for this user
  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('app_name', 'timekeeper')
    .single()

  // Compose profile with subscription data
  const profile: ProfileWithSubscription = {
    ...coreProfile,
    subscription_status: subscription?.status ?? 'none',
    trial_ends_at: subscription?.trial_end ?? null,
    has_payment_method: subscription?.has_payment_method ?? false,
  }

  // Fetch geofences (was: locais)
  const { data: geofences } = await supabase
    .from('app_timekeeper_geofences')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('name')

  // Fetch entries (was: registros) - last 90 days
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: entries } = await supabase
    .from('app_timekeeper_entries')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('entry_at', ninetyDaysAgo.toISOString())
    .order('entry_at', { ascending: false })

  return (
    <TimekeeperDashboard
      profile={profile}
      entries={entries || []}
      geofences={geofences || []}
    />
  )
}
