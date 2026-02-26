import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { PieChart, DollarSign, Users, TrendingUp, Activity } from 'lucide-react'

export const metadata = { title: 'Analytics | Admin | OnSite Club' }

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: admin } = await supabase
    .from('core_admin_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!admin) redirect('/club')

  // Fetch KPIs
  const [
    { count: totalUsers },
    { data: subscriptions },
    { count: totalCalculations },
    { count: totalEntries },
  ] = await Promise.all([
    supabase.from('core_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('billing_subscriptions').select('status, stripe_price_id'),
    supabase.from('app_calculator_calculations').select('*', { count: 'exact', head: true }),
    supabase.from('app_timekeeper_entries').select('*', { count: 'exact', head: true }),
  ])

  const activeSubs = subscriptions?.filter(s => s.status === 'active' || s.status === 'trialing').length ?? 0
  const mrr = activeSubs * 9.99 // Simplified — real MRR from Stripe

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Business Analytics</h1>
        <p className="text-[#667085] mt-1">Key performance indicators</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={<DollarSign className="w-6 h-6 text-green-500" />} value={`$${mrr.toFixed(0)}`} label="MRR (est.)" color="green" />
        <KPICard icon={<Users className="w-6 h-6 text-blue-500" />} value={(totalUsers ?? 0).toString()} label="Total Users" color="blue" />
        <KPICard icon={<TrendingUp className="w-6 h-6 text-purple-500" />} value={activeSubs.toString()} label="Active Subscriptions" color="purple" />
        <KPICard icon={<Activity className="w-6 h-6 text-amber-500" />} value={((totalCalculations ?? 0) + (totalEntries ?? 0)).toLocaleString()} label="Total Data Points" color="amber" />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-[#101828] mb-4">Subscription Status</h2>
          <div className="space-y-3">
            {['active', 'trialing', 'past_due', 'canceled', 'inactive'].map(status => {
              const count = subscriptions?.filter(s => s.status === status).length ?? 0
              if (count === 0) return null
              const colors: Record<string, string> = {
                active: 'bg-green-500', trialing: 'bg-blue-500', past_due: 'bg-yellow-500',
                canceled: 'bg-red-500', inactive: 'bg-gray-400',
              }
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colors[status]}`} />
                    <span className="text-sm text-[#101828] capitalize">{status.replace('_', ' ')}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#101828]">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-[#101828] mb-4">Data Volume</h2>
          <div className="space-y-4">
            <DataRow label="Timekeeper entries" value={(totalEntries ?? 0).toLocaleString()} />
            <DataRow label="Calculator calculations" value={(totalCalculations ?? 0).toLocaleString()} />
            <DataRow label="Subscriptions" value={(subscriptions?.length ?? 0).toString()} />
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  const bgColor = `bg-${color}-50`
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="mb-3">{icon}</div>
      <p className="text-2xl font-bold text-[#101828]">{value}</p>
      <p className="text-xs text-[#667085] mt-1">{label}</p>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-[#667085]">{label}</span>
      <span className="text-sm font-semibold text-[#101828]">{value}</span>
    </div>
  )
}
