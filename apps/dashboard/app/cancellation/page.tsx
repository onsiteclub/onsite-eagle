import { HardHat } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Cancellation Policy',
}

export default function CancellationPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Cancellation & Refund Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 text-lg mb-8">
            Last updated: January 2025
          </p>

          {/* Highlight Box */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-green-900 mb-2">✓ 100% Refund Guarantee</h3>
            <p className="text-green-700">
              If you cancel within the first year of your paid subscription, you'll receive a full refund 
              of all payments made. No questions asked.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Free Trial</h2>
            <p className="text-gray-600">
              All new accounts start with a 6-month free trial. During the trial period, you have full access 
              to all premium features. No credit card is required to start the trial.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How to Cancel</h2>
            <p className="text-gray-600 mb-4">You can cancel your subscription at any time through:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Your account Settings page (recommended)</li>
              <li>The Stripe Customer Portal</li>
              <li>Contacting support at support@onsite.ca</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. What Happens After Cancellation</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>You'll continue to have access until the end of your current billing period</li>
              <li>Your data will be retained for 30 days after account closure</li>
              <li>You can reactivate your account at any time</li>
              <li>Blades points remain on your account if you reactivate</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Refund Policy</h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 font-semibold text-gray-900">Timeframe</th>
                    <th className="py-3 font-semibold text-gray-900">Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-3 text-gray-600">During 6-month trial</td>
                    <td className="py-3 text-gray-600">No charge, cancel anytime</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-600">First year of paid subscription</td>
                    <td className="py-3 text-green-600 font-medium">100% refund</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-600">After first year</td>
                    <td className="py-3 text-gray-600">No refund (access until period end)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Processing Time</h2>
            <p className="text-gray-600">
              Refunds are processed within 5-10 business days and will appear on your original payment method.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Contact</h2>
            <p className="text-gray-600">
              For cancellation assistance or refund requests, contact: support@onsite.ca
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
