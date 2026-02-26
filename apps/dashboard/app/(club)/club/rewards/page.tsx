import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Award, Gift, Clock, Camera, Calculator, Users, Tag, ExternalLink } from 'lucide-react'

export const metadata = { title: 'Rewards | OnSite Club' }

export default async function RewardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch blades + partner offers in parallel
  const [{ data: transactions }, { data: partnerOffers }] = await Promise.all([
    supabase
      .from('blades_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('club_partner_offers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0
  const lifetimeEarned = transactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) ?? 0

  // Level
  let level = 'Rookie'
  let nextLevel = 'Apprentice'
  let progress = Math.min(balance / 100, 1)
  let needed = 100 - balance
  if (balance >= 5000) { level = 'Legend'; nextLevel = 'Max'; progress = 1; needed = 0 }
  else if (balance >= 1000) { level = 'Master'; nextLevel = 'Legend'; progress = (balance - 1000) / 4000; needed = 5000 - balance }
  else if (balance >= 500) { level = 'Journeyman'; nextLevel = 'Master'; progress = (balance - 500) / 500; needed = 1000 - balance }
  else if (balance >= 100) { level = 'Apprentice'; nextLevel = 'Journeyman'; progress = (balance - 100) / 400; needed = 500 - balance }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Rewards</h1>
        <p className="text-[#667085] mt-1">Earn Blades and unlock rewards</p>
      </div>

      {/* Balance */}
      <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-amber-100 text-sm">Blades Balance</p>
            <p className="text-4xl font-bold">{balance.toLocaleString()}</p>
          </div>
          <Award className="w-10 h-10 text-amber-200" />
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-sm text-amber-100 mb-1">
            <span>{level}</span>
            <span>{nextLevel !== 'Max' ? `${needed} to ${nextLevel}` : 'Max Level!'}</span>
          </div>
          <div className="h-2 bg-amber-300/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
        <p className="text-amber-100 text-xs">Lifetime earned: {lifetimeEarned.toLocaleString()} Blades</p>
      </div>

      {/* Partner Offers */}
      {partnerOffers && partnerOffers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-[#101828]">Exclusive Member Offers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partnerOffers.map(offer => (
              <div key={offer.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#101828]">{offer.partner_name}</h3>
                  {offer.min_tier && offer.min_tier !== 'free' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 text-brand-700 uppercase">
                      {offer.min_tier}+
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#667085] mb-3">{offer.title_en}</p>
                {offer.discount_value && (
                  <p className="text-lg font-bold text-brand-600 mb-2">
                    {offer.discount_type === 'percentage' ? `${offer.discount_value}% off` : `$${offer.discount_value} off`}
                  </p>
                )}
                {offer.coupon_code && (
                  <div className="flex items-center gap-2 mb-3">
                    <code className="px-3 py-1.5 bg-gray-50 rounded-lg text-sm font-mono font-medium text-[#101828]">
                      {offer.coupon_code}
                    </code>
                  </div>
                )}
                {offer.valid_until && (
                  <p className="text-xs text-[#667085]">
                    Valid until {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(offer.valid_until))}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to Earn */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">How to Earn Blades</h2>
        <div className="space-y-3">
          {[
            { icon: Clock, label: 'Daily clock-in (Timekeeper)', amount: '+10' },
            { icon: Calculator, label: 'Voice calculation (Calculator)', amount: '+5' },
            { icon: Camera, label: 'Photo approved by AI (Field/Eagle)', amount: '+20' },
            { icon: Award, label: 'Badge unlocked', amount: '+50' },
            { icon: Users, label: 'Refer a friend who joins', amount: '+100' },
            { icon: Gift, label: 'Complete an inspection phase', amount: '+25' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-[#101828]">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-amber-600">{item.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Recent Transactions</h2>
        {!transactions || transactions.length === 0 ? (
          <p className="text-[#667085] text-sm text-center py-4">No transactions yet. Start using apps to earn Blades!</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-[#101828]">{tx.reason || tx.type}</p>
                  <p className="text-xs text-[#667085]">
                    {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(tx.created_at))}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
