import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { CreditCard, AlertCircle, Check, X } from 'lucide-react'
import { SubscriptionManager } from '@/components/account/SubscriptionManager'
import type { SubscriptionStatus } from '@/lib/supabase/types'

export const metadata = { title: 'Subscription | OnSite Club' }

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('app_name', 'timekeeper')
    .single()

  const status: SubscriptionStatus = subscription?.status ?? 'none'

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Subscription</h1>
        <p className="text-[#667085] mt-1">Manage your plan and billing</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-[#101828]">Current Plan</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <p className="font-medium text-[#101828]">Status</p>
              <p className="text-sm text-[#667085]">Current subscription status</p>
            </div>
            <SubscriptionBadge status={status} />
          </div>

          {status === 'trialing' && subscription?.trial_end && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900">Trial active</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Your trial ends on {formatDate(subscription.trial_end)}.
                    After that, you will be charged CAD $9.99/month.
                  </p>
                </div>
              </div>
            </div>
          )}

          <SubscriptionManager
            hasPaymentMethod={subscription?.has_payment_method || false}
            subscriptionStatus={status}
            stripeCustomerId={subscription?.stripe_customer_id ?? null}
          />

          <div className="pt-4">
            <p className="font-medium text-[#101828] mb-3">Unlocked Features</p>
            <div className="space-y-2">
              <FeatureStatus name="Voice Calculator" enabled={status === 'active' || status === 'trialing'} />
              <FeatureStatus name="Auto Sync" enabled={status === 'active' || status === 'trialing'} />
              <FeatureStatus name="Blades Rewards" enabled={subscription?.has_payment_method || false} />
              <FeatureStatus name="Export Reports" enabled={status === 'active'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubscriptionBadge({ status }: { status: SubscriptionStatus | string }) {
  const badges: Record<string, { label: string; color: string }> = {
    trialing: { label: 'Trial Active', color: 'bg-blue-100 text-blue-800' },
    active: { label: 'Active', color: 'bg-green-100 text-green-800' },
    past_due: { label: 'Payment Pending', color: 'bg-yellow-100 text-yellow-800' },
    canceled: { label: 'Canceled', color: 'bg-red-100 text-red-800' },
    inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
    none: { label: 'No Subscription', color: 'bg-gray-100 text-gray-800' },
  }
  const badge = badges[status] || badges.none
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${badge.color}`}>
      {badge.label}
    </span>
  )
}

function FeatureStatus({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[#101828] text-sm">{name}</span>
      {enabled ? (
        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <Check className="w-4 h-4" /> Enabled
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-sm text-gray-400">
          <X className="w-4 h-4" /> Locked
        </span>
      )}
    </div>
  )
}
