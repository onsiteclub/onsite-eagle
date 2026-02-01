import { HardHat, Shield, Lock, Server, Eye } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Data Security',
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">OnSite Club</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Data Security</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 text-lg mb-8">
            We take the security of your data seriously. Here's how we protect your information.
          </p>

          {/* Security Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <SecurityCard
              icon={Lock}
              title="Encryption"
              description="All data is encrypted at rest (AES-256) and in transit (TLS 1.3)"
            />
            <SecurityCard
              icon={Server}
              title="Secure Infrastructure"
              description="Hosted on enterprise-grade servers with 99.9% uptime SLA"
            />
            <SecurityCard
              icon={Shield}
              title="Access Control"
              description="Row-level security ensures you only see your own data"
            />
            <SecurityCard
              icon={Eye}
              title="Privacy by Design"
              description="We collect only what's necessary and never sell your data"
            />
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Infrastructure Security</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Database hosted on Supabase (SOC 2 Type II compliant)</li>
              <li>Application hosted on Vercel (SOC 2 Type II compliant)</li>
              <li>Payment processing by Stripe (PCI DSS Level 1 certified)</li>
              <li>Regular security audits and penetration testing</li>
              <li>Automated vulnerability scanning</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Protection</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Passwords are hashed using bcrypt with salt</li>
              <li>Sessions expire automatically after inactivity</li>
              <li>Two-factor authentication available (coming soon)</li>
              <li>Device linking limits one mobile device per account</li>
              <li>Automatic logout on suspicious activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Location Data</h2>
            <p className="text-gray-600 mb-4">
              Special care is taken with location data used by the Timekeeper feature:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>GPS coordinates are only collected when the app is actively running</li>
              <li>Location data is stored in encrypted format</li>
              <li>You control which job sites are tracked</li>
              <li>Location history can be deleted at any time</li>
              <li>We never share location data with third parties</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Responsibilities</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Use a strong, unique password</li>
              <li>Don't share your account credentials</li>
              <li>Log out when using shared devices</li>
              <li>Keep your email address up to date</li>
              <li>Report suspicious activity immediately</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Incident Response</h2>
            <p className="text-gray-600">
              In the unlikely event of a data breach, we will notify affected users within 72 hours, 
              take immediate steps to contain the breach, and work with appropriate authorities as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Security Team</h2>
            <p className="text-gray-600">
              To report a security vulnerability or concern: security@onsite.ca
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/" className="text-brand-600 hover:text-brand-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  )
}

function SecurityCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any
  title: string
  description: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-brand-600" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}
