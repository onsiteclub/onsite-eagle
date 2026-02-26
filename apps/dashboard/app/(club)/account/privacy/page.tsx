import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Lock, Download, FileText, Trash2 } from 'lucide-react'

export const metadata = { title: 'Privacy | OnSite Club' }

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: consents } = await supabase
    .from('core_consents')
    .select('consent_type, granted, granted_at, document_version')
    .eq('user_id', user.id)
    .order('granted_at', { ascending: false })

  const consentMap = new Map<string, { granted: boolean; date: string; version: string }>()
  consents?.forEach(c => {
    if (!consentMap.has(c.consent_type)) {
      consentMap.set(c.consent_type, {
        granted: c.granted,
        date: c.granted_at,
        version: c.document_version || '1.0',
      })
    }
  })

  const consentLabels: Record<string, string> = {
    terms_of_service: 'Terms of Service',
    privacy_policy: 'Privacy Policy',
    data_collection: 'Data Collection',
    voice_collection: 'Voice Data Collection',
    voice_training: 'Voice Training (AI)',
    location_tracking: 'Location Tracking',
    analytics: 'Analytics & Usage',
    marketing: 'Marketing Communications',
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Privacy</h1>
        <p className="text-[#667085] mt-1">Manage your data and consent preferences</p>
      </div>

      {/* Consents */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-[#101828]">Consent Preferences</h2>
        </div>

        <div className="space-y-3">
          {Object.entries(consentLabels).map(([type, label]) => {
            const consent = consentMap.get(type)
            return (
              <div key={type} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#101828]">{label}</p>
                  {consent?.date && (
                    <p className="text-xs text-[#667085]">
                      {consent.granted ? 'Granted' : 'Revoked'} on {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(consent.date))}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  consent?.granted ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {consent?.granted ? 'Active' : 'Not granted'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <Download className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-[#101828]">Export Your Data</h2>
        </div>
        <p className="text-sm text-[#667085] mb-4">
          Download a copy of all your data including profile, work hours, calculations, and activity history.
        </p>
        <button className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">
          Request Data Export
        </button>
      </div>

      {/* Delete Account */}
      <div className="bg-white rounded-2xl border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-[#101828]">Delete Account</h2>
        </div>
        <p className="text-sm text-[#667085] mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
          Delete My Account
        </button>
      </div>
    </div>
  )
}
