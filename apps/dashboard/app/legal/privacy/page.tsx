import { Lock } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Privacy Policy | OnSite Club' }

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <Link href="/club" className="text-sm text-brand-500 hover:text-brand-600 mb-6 inline-block">&larr; Back to Hub</Link>
      <div className="flex items-center gap-3 mb-6">
        <Lock className="w-8 h-8 text-brand-500" />
        <h1 className="text-3xl font-bold text-[#101828]">Privacy Policy</h1>
      </div>
      <div className="prose prose-gray max-w-none">
        <p className="text-[#667085]">Last updated: February 2026</p>
        <h2>1. Data We Collect</h2>
        <p>We collect: profile information (name, email, trade), work data (hours, locations, calculations), device information, and usage analytics.</p>
        <h2>2. How We Use Data</h2>
        <p>Your data powers your personal dashboard, career statistics, and rewards. Anonymized data is used to improve services and train construction-specific AI models.</p>
        <h2>3. Voice Data</h2>
        <p>Voice recordings from the Calculator app are processed for transcription. With your consent, anonymized voice patterns may be used to improve our voice recognition for construction terminology.</p>
        <h2>4. Location Data</h2>
        <p>The Timekeeper app uses GPS for geofence-based clock-in/out. Location data is stored securely and only accessible by you and authorized managers.</p>
        <h2>5. Data Sharing</h2>
        <p>We do not sell your personal data. We share data only with: Supabase (database), Stripe (payments), and AI providers (anonymized, for service improvement).</p>
        <h2>6. Data Retention</h2>
        <p>Your data is retained while your account is active. Upon deletion, personal data is removed within 30 days. Anonymized aggregates may be retained.</p>
        <h2>7. Your Rights</h2>
        <p>You can export your data, revoke consents, or delete your account at any time from Settings &gt; Privacy.</p>
        <h2>8. Contact</h2>
        <p>Privacy questions: privacy@onsiteclub.ca</p>
      </div>
    </div>
  )
}
