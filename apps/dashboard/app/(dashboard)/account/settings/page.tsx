import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { CreditCard, Smartphone, Shield, User, AlertCircle, Check, X } from 'lucide-react'
import { SubscriptionManager } from './SubscriptionManager'
import { DeviceManager } from './DeviceManager'
import type { ProfileWithSubscription, SubscriptionStatus } from '@/lib/supabase/types'

export const metadata = {
  title: 'Settings | OnSite Club',
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch profile from core_profiles
  const { data: coreProfile } = await supabase
    .from('core_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch subscription from billing_subscriptions
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

  // Compose profile data
  const profile: ProfileWithSubscription | null = coreProfile ? {
    ...coreProfile,
    subscription_status: subscription?.status ?? 'none',
    trial_ends_at: subscription?.trial_end ?? null,
    has_payment_method: subscription?.has_payment_method ?? false,
    stripe_customer_id: subscription?.stripe_customer_id ?? null,
    voice_calculator_enabled: false,
    sync_enabled: false,
    device_id: device?.device_id ?? null,
    device_model: device?.model ?? null,
    device_platform: device?.platform ?? null,
    device_registered_at: device?.first_seen_at ?? null,
  } : null

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Subscription Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Status</p>
              <p className="text-sm text-gray-500">Current subscription status</p>
            </div>
            <SubscriptionBadge status={profile?.subscription_status || 'none'} />
          </div>

          {/* Trial Info */}
          {profile?.subscription_status === 'trialing' && profile?.trial_ends_at && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900">6-month trial active</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Your trial ends on {formatDate(profile.trial_ends_at)}.
                    After that, you will be charged CAD $9.99/month automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Manager (Client Component) */}
          <SubscriptionManager
            hasPaymentMethod={profile?.has_payment_method || false}
            subscriptionStatus={profile?.subscription_status || 'none'}
            stripeCustomerId={profile?.stripe_customer_id ?? null}
          />

          {/* Features */}
          <div className="pt-4">
            <p className="font-medium text-gray-900 mb-3">Unlocked Features</p>
            <div className="space-y-2">
              <FeatureStatus
                name="Voice Calculator"
                enabled={profile?.voice_calculator_enabled || false}
              />
              <FeatureStatus
                name="Auto Sync"
                enabled={profile?.sync_enabled || false}
              />
              <FeatureStatus
                name="Blades Rewards"
                enabled={profile?.has_payment_method || false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Device Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Linked Device</h2>
        </div>

        <DeviceManager
          deviceId={profile?.device_id ?? null}
          deviceModel={profile?.device_model ?? null}
          devicePlatform={profile?.device_platform ?? null}
          deviceRegisteredAt={profile?.device_registered_at ?? null}
        />
      </div>

      {/* Account Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Account</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Password</p>
              <p className="text-sm text-gray-500">••••••••</p>
            </div>
            <button className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              Change
            </button>
          </div>

          <div className="pt-4">
            <button className="text-sm text-red-600 hover:text-red-700 font-medium">
              Delete Account
            </button>
            <p className="text-xs text-gray-500 mt-1">
              This action is permanent and cannot be undone
            </p>
          </div>
        </div>
      </div>

      {/* Legal Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Security & Privacy</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LegalLink href="/terms" text="Terms of Use" />
          <LegalLink href="/privacy" text="Privacy Policy" />
          <LegalLink href="/cancellation" text="Cancellation Policy" />
          <LegalLink href="/security" text="Data Security" />
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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${badge.color}`}>
      {badge.label}
    </span>
  )
}

function FeatureStatus({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-700">{name}</span>
      {enabled ? (
        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <Check className="w-4 h-4" />
          Enabled
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-sm text-gray-400">
          <X className="w-4 h-4" />
          Locked
        </span>
      )}
    </div>
  )
}

function LegalLink({ href, text }: { href: string; text: string }) {
  return (
    <a
      href={href}
      className="block p-3 rounded-lg border border-gray-200 text-gray-700 hover:border-brand-300 hover:text-brand-600 transition-colors"
    >
      {text}
    </a>
  )
}
