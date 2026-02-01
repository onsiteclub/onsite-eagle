import { HardHat } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Use',
}

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Use</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 text-lg mb-8">
            Last updated: January 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Service Description</h2>
            <p className="text-gray-600">
              OnSite Club provides professional tools for construction workers, including time tracking (Timekeeper), 
              voice-enabled construction calculator, e-commerce services, and additional professional development resources.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Account Registration</h2>
            <p className="text-gray-600">
              You must provide accurate information when creating an account. You are responsible for maintaining 
              the security of your account credentials. Each account is for personal use only - one mobile device 
              per account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Subscription & Pricing</h2>
            <p className="text-gray-600">
              OnSite Premium costs CAD $9.99 per month after a 6-month free trial period. Payment is processed 
              automatically through Stripe. You may cancel at any time with 100% refund available in the first year.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600">
              You agree to use the service only for lawful purposes. Prohibited activities include: sharing account 
              credentials, attempting to reverse engineer the software, using the service for competitive analysis, 
              or any activity that interferes with the service's operation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data & Privacy</h2>
            <p className="text-gray-600">
              Your use of the service is also governed by our Privacy Policy. We collect location data only for 
              geofencing purposes within the Timekeeper feature, and this data is stored securely.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-600">
              OnSite Club is provided "as is" without warranties of any kind. We are not liable for any indirect, 
              incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Changes to Terms</h2>
            <p className="text-gray-600">
              We may update these terms from time to time. Continued use of the service after changes constitutes 
              acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact</h2>
            <p className="text-gray-600">
              For questions about these terms, contact us at: support@onsite.ca
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
