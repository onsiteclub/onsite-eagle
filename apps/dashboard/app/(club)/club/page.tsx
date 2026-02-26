import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { getWeeklyStats, getAppStats, getRecentActivity, getLatestNews, getStreak } from '@/lib/queries/hub-stats'
import { getFirstName } from '@/lib/utils'
import Link from 'next/link'
import {
  Clock,
  Camera,
  Calculator,
  ArrowRight,
  TrendingUp,
  Flame,
  Newspaper,
  Zap,
  Activity,
} from 'lucide-react'
import { StatBox } from '@/components/ui/StatBox'

export const metadata = { title: 'Hub | OnSite Club' }

export default async function ClubHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('core_profiles')
    .select('first_name, preferred_name, full_name, created_at')
    .eq('id', user.id)
    .single()

  const [weeklyStats, appStats, recentActivity, latestNews, streak] = await Promise.all([
    getWeeklyStats(supabase, user.id),
    getAppStats(supabase, user.id),
    getRecentActivity(supabase, user.id),
    getLatestNews(supabase, 3),
    getStreak(supabase, user.id),
  ])

  const displayName = profile?.preferred_name || profile?.first_name || getFirstName(profile?.full_name)
  const memberSince = profile?.created_at
    ? new Intl.DateTimeFormat('en-CA', { month: 'short', year: 'numeric' }).format(new Date(profile.created_at))
    : null

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome + Streak */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Good morning, {displayName}!
          </h1>
          <p className="text-[#667085] mt-1">
            {memberSince && `Member since ${memberSince}`}
          </p>
        </div>
        {streak.current > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm font-bold text-orange-700">{streak.current} day streak</p>
              <p className="text-[10px] text-orange-500">Best: {streak.longest} days</p>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Stats */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-[#101828]">This Week</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            icon={<Clock className="w-5 h-5 text-blue-500" />}
            value={`${weeklyStats.hoursWorked}h`}
            label="Hours worked"
          />
          <StatBox
            icon={<Flame className="w-5 h-5 text-orange-500" />}
            value={weeklyStats.sessionsCount.toString()}
            label="Sessions"
          />
          <StatBox
            icon={<Camera className="w-5 h-5 text-green-500" />}
            value={weeklyStats.photosUploaded.toString()}
            label="Photos uploaded"
          />
          <StatBox
            icon={<Calculator className="w-5 h-5 text-purple-500" />}
            value={weeklyStats.calculationsDone.toString()}
            label="Calculations"
          />
        </div>
      </div>

      {/* News & Updates */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-[#101828]">News & Updates</h2>
          </div>
          <Link href="/club/news" className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {latestNews.length === 0 ? (
          <p className="text-[#667085] text-sm">No news yet — stay tuned for campaigns, badges, and updates.</p>
        ) : (
          <div className="space-y-3">
            {latestNews.map(item => (
              <div key={item.id} className="flex items-start gap-3 py-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 text-brand-700 uppercase shrink-0 mt-0.5">
                  {item.type}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-[#101828]">{item.title_en}</p>
                  {item.cta_url && (
                    <a href={item.cta_url} className="text-xs text-brand-500 hover:text-brand-600">
                      {item.cta_label || 'Learn more'} &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Apps */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#101828]">My Apps</h2>
          <Link href="/club/apps" className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appStats.timekeeper.hasData && (
            <MiniAppCard
              name="Timekeeper"
              subtitle="Hours tracking"
              stat={`${appStats.timekeeper.entries} entries`}
              href="/app/timekeeper"
              color="blue"
            />
          )}
          {appStats.calculator.hasData && (
            <MiniAppCard
              name="Calculator"
              subtitle="Voice calculations"
              stat={`${appStats.calculator.calculations} calcs`}
              href="/app/calculator"
              color="purple"
            />
          )}
          {appStats.field.hasData && (
            <MiniAppCard
              name="Field"
              subtitle="Site documentation"
              stat={`${appStats.field.photos} photos`}
              href="/app/field"
              color="green"
            />
          )}
          {appStats.eagle.hasData && (
            <MiniAppCard
              name="Eagle"
              subtitle="Visual inspection"
              stat={`${appStats.eagle.sites} sites`}
              href="/app/eagle"
              color="teal"
            />
          )}
          {appStats.shop.hasData && (
            <MiniAppCard
              name="Shop"
              subtitle="Equipment store"
              stat={`${appStats.shop.orders} orders`}
              href="/app/shop"
              color="orange"
            />
          )}
          {!appStats.timekeeper.hasData && !appStats.calculator.hasData && !appStats.field.hasData && (
            <div className="col-span-full bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-[#667085]">No app activity yet. Start using your apps to see stats here.</p>
              <Link href="/club/apps" className="text-brand-500 hover:text-brand-600 text-sm font-medium mt-2 inline-block">
                Explore apps
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-[#101828]">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {recentActivity.map(item => {
              const iconMap = { entry: Clock, photo: Camera, calculation: Calculator }
              const Icon = iconMap[item.type]
              return (
                <div key={item.id} className="flex items-center gap-3 py-1.5">
                  <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-[#101828] flex-1">{item.description}</span>
                  <span className="text-xs text-[#667085] shrink-0">
                    {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(item.timestamp))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniAppCard({
  name, subtitle, stat, href, color,
}: {
  name: string; subtitle: string; stat: string; href: string
  color: 'blue' | 'purple' | 'green' | 'teal' | 'orange'
}) {
  const dotColor = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    teal: 'bg-teal-500',
    orange: 'bg-orange-500',
  }

  return (
    <Link
      href={href}
      className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor[color]}`} />
        <span className="font-semibold text-[#101828] text-sm">{name}</span>
      </div>
      <p className="text-xs text-[#667085] mb-3">{subtitle}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#101828]">{stat}</span>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
      </div>
    </Link>
  )
}
