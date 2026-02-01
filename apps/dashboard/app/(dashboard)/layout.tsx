import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import AssistantWidget from '@/components/assistant/AssistantWidget'
import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch profile from core_profiles
  const { data: coreProfile } = await supabase
    .from('core_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch subscription data from billing_subscriptions
  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('app_name', 'timekeeper')
    .single()

  // Fetch primary device from core_devices
  const { data: device } = await supabase
    .from('core_devices')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single()

  // Fetch blades balance
  const { data: bladesData } = await supabase
    .from('blades_transactions')
    .select('amount')
    .eq('user_id', user.id)

  const bladesBalance = bladesData?.reduce((sum, t) => sum + t.amount, 0) ?? 0

  // Compose profile with subscription data for components
  const profile = coreProfile ? {
    ...coreProfile,
    // Map subscription data
    stripe_customer_id: subscription?.stripe_customer_id ?? null,
    stripe_subscription_id: subscription?.stripe_subscription_id ?? null,
    subscription_status: subscription?.status ?? 'none',
    trial_ends_at: subscription?.trial_end ?? null,
    subscription_started_at: subscription?.current_period_start ?? null,
    subscription_canceled_at: subscription?.canceled_at ?? null,
    has_payment_method: subscription?.has_payment_method ?? false,
    // Map device data
    device_id: device?.device_id ?? null,
    device_registered_at: device?.first_seen_at ?? null,
    device_model: device?.model ?? null,
    device_platform: device?.platform ?? null,
    // Blades data
    blades_balance: bladesBalance,
    blades_lifetime_earned: bladesBalance > 0 ? bladesBalance : 0,
    level: 'rookie' as const,
    // Feature flags (can be from a settings table or defaults)
    voice_calculator_enabled: false,
    sync_enabled: false,
    // Admin flags (would come from admin_users table check)
    is_admin: false,
    is_suspended: false,
  } : null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      {profile && <AssistantWidget profile={profile} />}
    </div>
  )
}
