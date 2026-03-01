import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { BarChart3, Star } from 'lucide-react'
import { MonthlyHoursChart } from '@/components/charts/MonthlyHoursChart'

export const metadata = { title: 'My Stats | OnSite Club' }

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [hoursResult, photosResult, calcsResult, monthlyResult, streakResult] = await Promise.all([
    supabase
      .from('tmk_entries')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('frm_photos')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', user.id),
    supabase
      .from('ccl_calculations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('tmk_entries')
      .select('entry_at, duration_minutes')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('entry_at', sixMonthsAgo.toISOString()),
    supabase
      .from('club_streaks')
      .select('current_count, longest_count')
      .eq('user_id', user.id)
      .eq('streak_type', 'daily_activity')
      .single(),
  ])

  const totalMinutes = hoursResult.data?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) ?? 0
  const totalHours = Math.round(totalMinutes / 60)
  const totalPhotos = photosResult.count ?? 0
  const totalCalcs = calcsResult.count ?? 0
  const sessions = hoursResult.data?.length ?? 0

  // Monthly hours for chart
  const monthlyMap = new Map<string, number>()
  monthlyResult.data?.forEach(entry => {
    const date = new Date(entry.entry_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (entry.duration_minutes || 0) / 60)
  })

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyData: { month: string; hours: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyData.push({
      month: monthNames[d.getMonth()],
      hours: Math.round((monthlyMap.get(key) ?? 0) * 10) / 10,
    })
  }

  // Best day
  const bestDay = monthlyResult.data?.reduce<{ date: string; minutes: number } | null>((best, entry) => {
    const mins = entry.duration_minutes || 0
    if (!best || mins > best.minutes) return { date: entry.entry_at, minutes: mins }
    return best
  }, null)

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">My Statistics</h1>
        <p className="text-[#667085] mt-1">Your career overview across all OnSite apps</p>
      </div>

      {/* Career Totals */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Career Totals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-blue-50">
            <p className="text-3xl font-bold text-blue-700">{totalHours.toLocaleString()}</p>
            <p className="text-sm text-blue-600 mt-1">Hours tracked</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-green-50">
            <p className="text-3xl font-bold text-green-700">{totalPhotos.toLocaleString()}</p>
            <p className="text-sm text-green-600 mt-1">Photos uploaded</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-purple-50">
            <p className="text-3xl font-bold text-purple-700">{totalCalcs.toLocaleString()}</p>
            <p className="text-sm text-purple-600 mt-1">Calculations</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-amber-50">
            <p className="text-3xl font-bold text-amber-700">{sessions.toLocaleString()}</p>
            <p className="text-sm text-amber-600 mt-1">Sessions</p>
          </div>
        </div>
      </div>

      {/* Monthly Hours Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-[#101828]">Hours by Month</h2>
        </div>
        <MonthlyHoursChart data={monthlyData} />
      </div>

      {/* Highlights */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-[#101828]">Highlights</h2>
        </div>
        <div className="space-y-3">
          {bestDay && bestDay.minutes > 0 && (
            <HighlightRow
              label="Longest day"
              value={`${Math.round(bestDay.minutes / 60 * 10) / 10}h on ${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(bestDay.date))}`}
            />
          )}
          {(streakResult.data?.current_count ?? 0) > 0 && (
            <HighlightRow label="Current streak" value={`${streakResult.data!.current_count} consecutive days`} />
          )}
          {(streakResult.data?.longest_count ?? 0) > 0 && (
            <HighlightRow label="Best streak" value={`${streakResult.data!.longest_count} days`} />
          )}
          {totalPhotos > 0 && (
            <HighlightRow label="Total photos" value={`${totalPhotos} uploaded across all sites`} />
          )}
        </div>
      </div>
    </div>
  )
}

function HighlightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-[#667085]">{label}</span>
      <span className="text-sm font-medium text-[#101828]">{value}</span>
    </div>
  )
}
