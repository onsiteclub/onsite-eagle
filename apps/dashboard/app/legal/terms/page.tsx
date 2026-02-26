import { FileText } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Terms of Service | OnSite Club' }

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <Link href="/club" className="text-sm text-brand-500 hover:text-brand-600 mb-6 inline-block">&larr; Back to Hub</Link>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-brand-500" />
        <h1 className="text-3xl font-bold text-[#101828]">Terms of Service</h1>
      </div>
      <div className="prose prose-gray max-w-none">
        <p className="text-[#667085]">Last updated: February 2026</p>
        <p>By using OnSite Club services, you agree to these terms. OnSite Club provides construction productivity tools including time tracking, voice calculations, visual inspection, and equipment commerce.</p>
        <h2>1. Account</h2>
        <p>You must be 18+ and provide accurate information. You are responsible for maintaining the security of your account credentials.</p>
        <h2>2. Services</h2>
        <p>OnSite Club offers free and paid tiers. Paid subscriptions are billed monthly through Stripe. Trial periods are offered at our discretion.</p>
        <h2>3. Data</h2>
        <p>Your work data (hours, calculations, photos) belongs to you. We use anonymized, aggregated data to improve our services and train AI models as described in our Privacy Policy.</p>
        <h2>4. Acceptable Use</h2>
        <p>You agree not to misuse the platform, attempt unauthorized access, or use the services for illegal purposes.</p>
        <h2>5. Termination</h2>
        <p>You may delete your account at any time. We may suspend accounts that violate these terms.</p>
        <h2>6. Contact</h2>
        <p>Questions? Email us at support@onsiteclub.ca</p>
      </div>
    </div>
  )
}
