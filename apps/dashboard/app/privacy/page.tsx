import { HardHat } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 text-lg mb-8">
            Last updated: January 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Data We Collect</h2>
            <p className="text-gray-600 mb-4">We collect the following information:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
              <li><strong>Location Data:</strong> GPS coordinates for geofencing (Timekeeper only)</li>
              <li><strong>Device Information:</strong> Device model, platform, unique device ID</li>
              <li><strong>Usage Data:</strong> Work sessions, calculation history, feature usage</li>
              <li><strong>Payment Information:</strong> Processed by Stripe (we never see your card details)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Data</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide and improve our services</li>
              <li>Process automatic time tracking via geofencing</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related communications</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Location Data</h2>
            <p className="text-gray-600 mb-4">
              Our Timekeeper app uses GPS location to automatically track work hours when you enter or leave 
              a job site (geofencing). This data is:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Only collected when the app is running</li>
              <li>Stored securely and encrypted</li>
              <li>Never sold to third parties</li>
              <li>Deletable at your request</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Storage</h2>
            <p className="text-gray-600">
              Your data is stored securely on Supabase servers with encryption at rest and in transit. 
              We retain your data for as long as your account is active. You may request deletion at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">We use the following third-party services:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Supabase:</strong> Database and authentication</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>OpenAI:</strong> Voice transcription (Whisper) and interpretation (GPT-4o)</li>
              <li><strong>Vercel:</strong> Hosting</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Withdraw consent for location tracking</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
            <p className="text-gray-600">
              For privacy-related questions or data requests, contact us at: privacy@onsite.ca
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
