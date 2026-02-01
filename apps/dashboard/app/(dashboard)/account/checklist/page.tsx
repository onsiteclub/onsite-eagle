import { ClipboardCheck, Shield, FileCheck, Download } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Checklist',
}

export default function ChecklistPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back + Header */}
      <div>
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Checklist</h1>
        <p className="text-gray-600 mt-1">
          Safety and inspection checklists for construction sites
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl p-8 text-white text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
          <ClipboardCheck className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold mb-3">Coming Soon</h2>
        <p className="text-teal-100 text-lg max-w-md mx-auto">
          Digital checklists to keep your job site safe and compliant.
        </p>
      </div>

      {/* What to Expect */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">What to Expect</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeaturePreview
            icon={Shield}
            title="Safety Checklists"
            description="Pre-shift safety inspections and hazard assessments"
          />
          <FeaturePreview
            icon={FileCheck}
            title="Compliance Reports"
            description="Generate reports for regulatory compliance"
          />
          <FeaturePreview
            icon={Download}
            title="Offline Access"
            description="Complete checklists even without internet"
          />
        </div>
      </div>

      {/* Checklist Types Preview */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Planned Checklists</h3>
        <div className="space-y-3">
          {[
            { name: 'Daily Safety Inspection', items: 25 },
            { name: 'Equipment Pre-Use Check', items: 15 },
            { name: 'Fall Protection Audit', items: 20 },
            { name: 'Fire Safety Review', items: 18 },
            { name: 'PPE Compliance Check', items: 12 },
            { name: 'Site Clean-Up Checklist', items: 10 },
          ].map((checklist) => (
            <div
              key={checklist.name}
              className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-teal-600" />
                <span className="font-medium text-gray-900">{checklist.name}</span>
              </div>
              <span className="text-sm text-gray-500">{checklist.items} items</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notify Me */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Want to be notified when checklists launch?
        </h3>
        <p className="text-gray-500 mb-4">
          We'll send you an email when digital checklists are ready.
        </p>
        <button
          disabled
          className="px-6 py-3 bg-teal-500 text-white font-semibold rounded-xl opacity-50 cursor-not-allowed"
        >
          Notify Me (Coming Soon)
        </button>
      </div>
    </div>
  )
}

function FeaturePreview({
  icon: Icon,
  title,
  description,
}: {
  icon: any
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-teal-600" />
      </div>
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  )
}
