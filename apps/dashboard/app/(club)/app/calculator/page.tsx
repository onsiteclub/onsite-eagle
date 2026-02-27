import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Calculator, Mic, Hash, TrendingUp, Clock } from 'lucide-react'
import { StatBox } from '@/components/ui/StatBox'

export const metadata = { title: 'Calculator | OnSite Club' }

export default async function CalculatorAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [{ data: calculations }, { count: totalCount }] = await Promise.all([
    supabase
      .from('ccl_calculations')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('ccl_calculations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const voiceCount = calculations?.filter(c => c.input_method === 'voice').length ?? 0
  const manualCount = calculations?.filter(c => c.input_method === 'manual').length ?? 0
  const voiceRate = calculations?.length ? Math.round((voiceCount / calculations.length) * 100) : 0

  const typeBreakdown = calculations?.reduce((acc, c) => {
    const type = c.calculation_type || 'other'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  const topTypes = Object.entries(typeBreakdown)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5) as [string, number][]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Calculator</h1>
        <p className="text-[#667085] mt-1">Voice-powered construction calculations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox variant="card" icon={<Hash className="w-5 h-5 text-purple-500" />} value={(totalCount ?? 0).toString()} label="Total calculations" />
        <StatBox variant="card" icon={<Clock className="w-5 h-5 text-blue-500" />} value={(calculations?.length ?? 0).toString()} label="Last 30 days" />
        <StatBox variant="card" icon={<Mic className="w-5 h-5 text-green-500" />} value={`${voiceRate}%`} label="Voice usage" />
        <StatBox variant="card" icon={<Calculator className="w-5 h-5 text-amber-500" />} value={manualCount.toString()} label="Manual calcs" />
      </div>

      {/* Top Types */}
      {topTypes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-[#101828] mb-4">Most Used Calculation Types</h2>
          <div className="space-y-3">
            {topTypes.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between py-2">
                <span className="text-sm text-[#101828] capitalize">{type.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.round((count / (calculations?.length || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-[#667085] w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Calculations */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Recent Calculations</h2>
        {!calculations || calculations.length === 0 ? (
          <p className="text-[#667085] text-sm text-center py-6">No calculations yet. Use the Calculator app to get started.</p>
        ) : (
          <div className="space-y-2">
            {calculations.slice(0, 15).map(calc => (
              <div key={calc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-[#101828] capitalize">{(calc.calculation_type || 'calculation').replace(/_/g, ' ')}</p>
                  <p className="text-xs text-[#667085]">
                    {calc.input_method === 'voice' ? '🎙️ Voice' : '⌨️ Manual'} · {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(calc.created_at))}
                  </p>
                </div>
                {calc.result_value != null && (
                  <span className="text-sm font-semibold text-[#101828]">
                    {Number(calc.result_value).toLocaleString()} {calc.result_unit || ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

