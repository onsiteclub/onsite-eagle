import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard, Wallet, ArrowUpRight, Snowflake, FileText, RefreshCw, Info } from 'lucide-react'
import { WaitlistForm } from './WaitlistForm'

export const metadata = { title: 'OnSite Card | OnSite Club' }

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('core_profiles')
    .select('full_name, first_name, worker_code')
    .eq('id', user.id)
    .single()

  // Check if already on waitlist
  const { data: waitlistEntry } = await supabase
    .from('crd_waitlist')
    .select('id, created_at')
    .eq('user_id', user.id)
    .single()

  const displayName = profile?.full_name || profile?.first_name || 'Member'

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">OnSite Card</h1>
        <p className="text-[#667085] mt-1">Your construction payment card</p>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-brand-50 to-teal-50 border border-brand-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-brand-900">OnSite Card arriving Q4 2026</h3>
            <p className="text-sm text-brand-700 mt-1">
              A real Visa/Mastercard branded by OnSite Club. Convert Blades to CAD, receive payroll,
              and get automatic discounts at Tim Hortons and Home Depot.
            </p>
          </div>
        </div>
      </div>

      {/* Card Preview */}
      <div className="bg-gradient-to-br from-[#0F766E] to-[#042f2c] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-teal-200" />
            <span className="text-teal-200 text-sm font-medium tracking-wider uppercase">OnSite Card</span>
          </div>
          <span className="text-teal-300 text-xs">VISA</span>
        </div>

        <p className="font-mono text-xl tracking-[0.2em] mb-6 text-teal-100">
          **** **** **** 0000
        </p>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-teal-300 text-[10px] uppercase tracking-wide">Card Holder</p>
            <p className="font-semibold">{displayName}</p>
          </div>
          <div className="text-right">
            <p className="text-teal-300 text-[10px] uppercase tracking-wide">Balance</p>
            <p className="font-semibold">$0.00</p>
          </div>
        </div>

        <p className="text-center text-teal-400 text-xs mt-6">Available soon</p>
      </div>

      {/* Actions — all disabled */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: ArrowUpRight, label: 'Load Funds' },
          { icon: RefreshCw, label: 'Convert Blades' },
          { icon: Snowflake, label: 'Freeze Card' },
          { icon: FileText, label: 'Statements' },
        ].map(action => (
          <button
            key={action.label}
            disabled
            className="flex flex-col items-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
          >
            <action.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Waitlist */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-brand-600" />
          </div>
          <h2 className="text-lg font-semibold text-[#101828]">Get Early Access</h2>
        </div>

        {waitlistEntry ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800 font-medium">You're on the waitlist!</p>
            <p className="text-green-600 text-sm mt-1">
              Joined {new Intl.DateTimeFormat('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(waitlistEntry.created_at))}. We'll notify you when the card launches.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[#667085] text-sm mb-4">
              Join the waitlist to be among the first to receive your OnSite Card.
              Early members get exclusive benefits and priority access.
            </p>
            <WaitlistForm
              userId={user.id}
              defaultName={displayName}
              defaultEmail={user.email ?? ''}
            />
          </>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Card Benefits</h2>
        <div className="space-y-3">
          {[
            { title: 'Blades to CAD', desc: 'Convert your earned Blades into real money on the card' },
            { title: 'Payroll Card', desc: 'Receive salary directly — no bank account needed' },
            { title: 'Expense Card', desc: 'Employer loads funds for materials & gas with MCC limits' },
            { title: 'Auto Discounts', desc: 'Recognized at Tim Hortons, Home Depot, and partners' },
            { title: '3 Card Tiers', desc: 'Free (basic), Pro (silver), Club (gold) matching your membership' },
          ].map(benefit => (
            <div key={benefit.title} className="flex items-start gap-3 py-2">
              <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#101828]">{benefit.title}</p>
                <p className="text-xs text-[#667085]">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
