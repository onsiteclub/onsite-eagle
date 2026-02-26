import { ClubSidebar } from '@/components/layout/ClubSidebar'
import { ClubHeader } from '@/components/layout/ClubHeader'
import AssistantWidget from '@/components/assistant/AssistantWidget'
import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClubLayout({
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

  // Fetch subscription data
  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('app_name', 'timekeeper')
    .single()

  // Fetch blades balance
  const { data: bladesData } = await supabase
    .from('blades_transactions')
    .select('amount')
    .eq('user_id', user.id)

  const bladesBalance = bladesData?.reduce((sum, t) => sum + t.amount, 0) ?? 0

  // Check admin status
  const { data: adminUser } = await supabase
    .from('core_admin_users')
    .select('is_active, role')
    .eq('user_id', user.id)
    .single()

  const profile = coreProfile ? {
    ...coreProfile,
    stripe_customer_id: subscription?.stripe_customer_id ?? null,
    stripe_subscription_id: subscription?.stripe_subscription_id ?? null,
    subscription_status: subscription?.status ?? 'none' as const,
    trial_ends_at: subscription?.trial_end ?? null,
    subscription_started_at: subscription?.current_period_start ?? null,
    subscription_canceled_at: subscription?.canceled_at ?? null,
    has_payment_method: subscription?.has_payment_method ?? false,
    blades_balance: bladesBalance,
    blades_lifetime_earned: bladesBalance > 0 ? bladesBalance : 0,
    level: 'rookie' as const,
    is_admin: adminUser?.is_active ?? false,
    is_suspended: false,
  } : null

  return (
    <div className="flex min-h-screen bg-[#F6F7F9]">
      <ClubSidebar isAdmin={profile?.is_admin ?? false} />
      <div className="flex-1 flex flex-col min-w-0">
        <ClubHeader profile={profile} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      {profile && <AssistantWidget profile={profile} />}
    </div>
  )
}
