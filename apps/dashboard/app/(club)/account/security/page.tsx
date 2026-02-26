import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Shield, Key, Monitor, Clock } from 'lucide-react'

export const metadata = { title: 'Security | OnSite Club' }

export default async function SecurityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const lastSignIn = user.last_sign_in_at
    ? new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(user.last_sign_in_at))
    : 'Unknown'

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Security</h1>
        <p className="text-[#667085] mt-1">Protect your account</p>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Key className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-[#101828]">Password</h2>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <div>
            <p className="font-medium text-[#101828]">Current password</p>
            <p className="text-sm text-[#667085]">Last changed: unknown</p>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">
            Change Password
          </button>
        </div>

        <div className="pt-4">
          <p className="text-sm text-[#667085]">
            Use a strong, unique password with at least 8 characters including uppercase, lowercase, and numbers.
          </p>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-[#101828]">Sessions</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-[#101828]">Current Session</p>
                <p className="text-xs text-[#667085]">Active now</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>
          </div>

          <div className="flex items-center gap-3 py-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-[#101828]">Last sign in</p>
              <p className="text-xs text-[#667085]">{lastSignIn}</p>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            Sign Out All Other Sessions
          </button>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-[#101828]">Security Tips</h2>
        </div>
        <ul className="space-y-2 text-sm text-[#667085]">
          <li>• Use a unique password that you don&apos;t use for other services</li>
          <li>• Never share your login credentials with anyone</li>
          <li>• Sign out when using shared or public devices</li>
          <li>• Keep your app and device software up to date</li>
        </ul>
      </div>
    </div>
  )
}
