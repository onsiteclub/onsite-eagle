import { Shield } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Data Security | OnSite Club' }

export default function SecurityPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <Link href="/club" className="text-sm text-brand-500 hover:text-brand-600 mb-6 inline-block">&larr; Back to Hub</Link>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-brand-500" />
        <h1 className="text-3xl font-bold text-[#101828]">Data Security</h1>
      </div>
      <div className="prose prose-gray max-w-none">
        <p className="text-[#667085]">Last updated: February 2026</p>
        <h2>Infrastructure</h2>
        <p>OnSite Club uses Supabase (hosted on AWS) with Row Level Security (RLS) policies ensuring users can only access their own data. All data is encrypted at rest and in transit.</p>
        <h2>Authentication</h2>
        <p>We use Supabase Auth with bcrypt password hashing, JWT tokens, and secure session management. OAuth via Google is available.</p>
        <h2>Access Control</h2>
        <p>Every database query is filtered through RLS policies. Admin access requires explicit approval and is logged in audit trails.</p>
        <h2>Payment Security</h2>
        <p>All payments are processed by Stripe. We never store credit card numbers directly.</p>
        <h2>Reporting</h2>
        <p>To report a security vulnerability, email security@onsiteclub.ca</p>
      </div>
    </div>
  )
}
