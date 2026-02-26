import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Trophy, Lock, TrendingUp } from 'lucide-react'
import { getNextBadges } from '@/lib/queries/badge-progress'

export const metadata = { title: 'Badges | OnSite Club' }

export default async function BadgesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: badges } = await supabase
    .from('club_badges')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const { data: userBadges } = await supabase
    .from('club_user_badges')
    .select('badge_id, earned_at')
    .eq('user_id', user.id)

  const earnedIds = new Set(userBadges?.map(ub => ub.badge_id) ?? [])
  const nextBadges = await getNextBadges(supabase, user.id, earnedIds, badges ?? [])

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">My Badges</h1>
        <p className="text-[#667085] mt-1">
          {earnedIds.size} of {badges?.length ?? 0} badges earned
        </p>
      </div>

      {/* Earned */}
      {earnedIds.size > 0 && (
        <div>
          <h2 className="font-semibold text-[#101828] mb-3">Earned</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {badges?.filter(b => earnedIds.has(b.id)).map(badge => (
              <div key={badge.id} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-brand-100 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-brand-600" />
                </div>
                <p className="text-sm font-medium text-[#101828]">{badge.name_en}</p>
                <p className="text-[10px] text-[#667085] uppercase mt-1">{badge.category}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next to Unlock */}
      {nextBadges.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-[#101828]">Next to Unlock</h2>
          </div>
          <div className="space-y-3">
            {nextBadges.map(badge => (
              <div key={badge.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#101828]">{badge.name_en}</p>
                      <p className="text-xs text-[#667085]">
                        {badge.currentValue.toLocaleString()} / {badge.threshold.toLocaleString()} {badge.criteria?.type}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-brand-600">
                    {Math.round(badge.progress * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${Math.round(badge.progress * 100)}%` }}
                  />
                </div>
                {badge.blades_reward && (
                  <p className="text-[10px] text-amber-600 mt-2">+{badge.blades_reward} Blades on unlock</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Badges */}
      <div>
        <h2 className="font-semibold text-[#101828] mb-3">All Badges</h2>
        {!badges || badges.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-[#667085]">Badge system coming soon!</p>
            <p className="text-xs text-[#667085] mt-1">Complete tasks across apps to earn badges and Blades rewards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {badges.map(badge => {
              const earned = earnedIds.has(badge.id)
              return (
                <div key={badge.id} className={`rounded-xl border p-4 text-center ${earned ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${earned ? 'bg-brand-100' : 'bg-gray-100'}`}>
                    {earned ? <Trophy className="w-6 h-6 text-brand-600" /> : <Lock className="w-5 h-5 text-gray-400" />}
                  </div>
                  <p className="text-sm font-medium text-[#101828]">{badge.name_en}</p>
                  <p className="text-[10px] text-[#667085] uppercase mt-1">{badge.category}</p>
                  {!earned && badge.blades_reward && (
                    <p className="text-[10px] text-amber-600 mt-1">+{badge.blades_reward} Blades</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
