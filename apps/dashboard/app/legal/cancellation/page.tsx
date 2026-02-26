import { FileText } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Cancellation Policy | OnSite Club' }

export default function CancellationPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <Link href="/club" className="text-sm text-brand-500 hover:text-brand-600 mb-6 inline-block">&larr; Back to Hub</Link>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-brand-500" />
        <h1 className="text-3xl font-bold text-[#101828]">Cancellation Policy</h1>
      </div>
      <div className="prose prose-gray max-w-none">
        <p className="text-[#667085]">Last updated: February 2026</p>
        <h2>Subscription Cancellation</h2>
        <p>You can cancel your subscription at any time from Settings &gt; Subscription. Your access continues until the end of your current billing period.</p>
        <h2>Trial Cancellation</h2>
        <p>If you cancel during a trial period, you will not be charged. Your access continues until the trial end date.</p>
        <h2>Refunds</h2>
        <p>Refunds are handled on a case-by-case basis. Contact support@onsiteclub.ca within 7 days of a charge for refund requests.</p>
        <h2>Data After Cancellation</h2>
        <p>Your data is preserved for 90 days after cancellation. After that, it may be deleted. You can export your data before canceling.</p>
        <h2>Reactivation</h2>
        <p>You can reactivate your subscription at any time. If within the 90-day retention period, your data will be restored.</p>
      </div>
    </div>
  )
}
