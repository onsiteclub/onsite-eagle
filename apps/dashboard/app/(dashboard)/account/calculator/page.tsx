import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Calculator, Mic, Lock, Check, ExternalLink, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Voice Calculator',
}

export default async function CalculatorDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('voice_calculator_enabled, has_payment_method, subscription_status, trial_ends_at')
    .eq('id', user.id)
    .single()

  const voiceEnabled = profile?.voice_calculator_enabled || false
  const calculatorUrl = process.env.NEXT_PUBLIC_CALCULATOR_URL || 'https://calc.onsite.ca'

  let trialDaysRemaining = 0
  if (profile?.subscription_status === 'trialing' && profile?.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at)
    const now = new Date()
    trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Voice Calculator</h1>
        <p className="text-gray-600 mt-1">Construction calculator with fractions and voice input</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard icon={Mic} title="Voice Input" value={voiceEnabled ? 'Enabled' : 'Locked'} status={voiceEnabled ? 'active' : 'locked'} />
        <StatusCard icon={Clock} title="Subscription" value={profile?.subscription_status === 'trialing' ? `Trial (${trialDaysRemaining}d)` : 'Active'} status={profile?.subscription_status === 'active' ? 'active' : 'trial'} />
        <StatusCard icon={TrendingUp} title="Usage" value="Coming Soon" status="coming" />
      </div>

      {!voiceEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 text-lg">Unlock Voice Calculator</h3>
              <p className="text-yellow-700 mt-1">Add a payment method to unlock voice input powered by Whisper AI and GPT-4o.</p>
              <Link href="/account/settings" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors">
                Add Payment Method
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Basic Calculator</h3>
              <p className="text-sm text-gray-500">Always available</p>
            </div>
          </div>
          <ul className="space-y-3">
            <FeatureItem enabled text="Inch fractions (5 1/2 + 3 1/4)" />
            <FeatureItem enabled text="Feet and inches" />
            <FeatureItem enabled text="Works 100% offline" />
            <FeatureItem enabled text="Always free" />
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Mic className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Voice Input</h3>
              <p className="text-sm text-gray-500">{voiceEnabled ? 'Unlocked' : 'Requires payment method'}</p>
            </div>
          </div>
          <ul className="space-y-3">
            <FeatureItem enabled={voiceEnabled} text="Speak calculations out loud" />
            <FeatureItem enabled={voiceEnabled} text="Whisper AI transcription" />
            <FeatureItem enabled={voiceEnabled} text="GPT-4o interpretation" />
            <FeatureItem enabled={voiceEnabled} text="Hands-free on job site" />
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h3>
        <a href={calculatorUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
              <Calculator className="w-6 h-6 text-gray-600 group-hover:text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-purple-700">Open Calculator</p>
              <p className="text-sm text-gray-500">Launch in new tab</p>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
        </a>
      </div>

      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-500 mb-2">Usage Statistics</h3>
        <p className="text-gray-400">Calculation history and more stats coming soon.</p>
      </div>
    </div>
  )
}

function StatusCard({ icon: Icon, title, value, status }: { icon: any; title: string; value: string; status: 'active' | 'locked' | 'trial' | 'coming' }) {
  const colors = {
    active: 'bg-green-50 text-green-600',
    locked: 'bg-red-50 text-red-600',
    trial: 'bg-blue-50 text-blue-600',
    coming: 'bg-gray-50 text-gray-400',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-lg ${colors[status]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function FeatureItem({ enabled, text }: { enabled: boolean; text: string }) {
  return (
    <li className="flex items-center gap-3">
      {enabled ? (
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-3 h-3 text-green-600" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
          <Lock className="w-3 h-3 text-gray-400" />
        </div>
      )}
      <span className={enabled ? 'text-gray-700' : 'text-gray-400'}>{text}</span>
    </li>
  )
}