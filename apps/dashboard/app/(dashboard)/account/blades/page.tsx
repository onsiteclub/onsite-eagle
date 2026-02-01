import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Award, Gift, Users, ShoppingBag, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { UserLevel } from '@/lib/supabase/types'

export const metadata = {
  title: 'Blades Rewards | OnSite Club',
}

export default async function BladesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch transactions from blades_transactions
  const { data: transactions } = await supabase
    .from('blades_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Calculate balance and lifetime from transactions
  const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0
  const lifetime = transactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) ?? 0

  // Determine level based on lifetime earnings
  const getUserLevel = (blades: number): UserLevel => {
    if (blades >= 5000) return 'legend'
    if (blades >= 1000) return 'master'
    if (blades >= 500) return 'journeyman'
    if (blades >= 100) return 'apprentice'
    return 'rookie'
  }

  const levelInfo: Record<UserLevel, { min: number; max: number; color: string; bgColor: string }> = {
    rookie: { min: 0, max: 99, color: 'text-gray-700', bgColor: 'bg-gray-100' },
    apprentice: { min: 100, max: 499, color: 'text-blue-700', bgColor: 'bg-blue-100' },
    journeyman: { min: 500, max: 999, color: 'text-green-700', bgColor: 'bg-green-100' },
    master: { min: 1000, max: 4999, color: 'text-purple-700', bgColor: 'bg-purple-100' },
    legend: { min: 5000, max: Infinity, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  }

  const currentLevel = getUserLevel(lifetime)
  const level = levelInfo[currentLevel]

  // Calculate progress to next level
  const levelOrder: UserLevel[] = ['rookie', 'apprentice', 'journeyman', 'master', 'legend']
  const currentIndex = levelOrder.indexOf(currentLevel)
  const nextLevelName = currentIndex < levelOrder.length - 1 ? levelOrder[currentIndex + 1] : 'legend'
  const nextLevel = levelInfo[nextLevelName]
  const progress = nextLevel
    ? Math.min(100, ((lifetime - level.min) / (nextLevel.min - level.min)) * 100)
    : 100

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back + Header */}
      <div>
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Blades Rewards</h1>
        <p className="text-gray-600 mt-1">
          Earn points and unlock rewards
        </p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Blades Balance</h2>
            </div>
            <p className="text-yellow-100">Your loyalty points</p>
          </div>
          <div className="text-right">
            <p className="text-6xl font-bold">{balance}</p>
            <p className="text-yellow-100 mt-1">Blades</p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${level.bgColor} ${level.color}`}>
              {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
            </span>
            {nextLevelName !== currentLevel && (
              <span className="text-yellow-100 text-sm">
                {nextLevel.min - lifetime} to {nextLevelName.charAt(0).toUpperCase() + nextLevelName.slice(1)}
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-yellow-100 text-sm">Lifetime Earned</p>
            <p className="text-2xl font-bold">{lifetime}</p>
          </div>
          <div>
            <p className="text-yellow-100 text-sm">Current Level</p>
            <p className="text-2xl font-bold capitalize">{currentLevel}</p>
          </div>
        </div>
      </div>

      {/* How to Earn */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">How to Earn Blades</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EarnCard
            icon={ShoppingBag}
            title="First Purchase"
            description="Complete your first order"
            blades={2}
          />
          <EarnCard
            icon={Users}
            title="Refer a Friend"
            description="For each friend who signs up"
            blades={2}
          />
          <EarnCard
            icon={TrendingUp}
            title="More Coming"
            description="Additional ways to earn"
            comingSoon
          />
        </div>
      </div>

      {/* Levels */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Levels</h3>
        <div className="space-y-3">
          {(Object.entries(levelInfo) as [UserLevel, typeof levelInfo[UserLevel]][]).map(([name, info]) => (
            <div
              key={name}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                name === currentLevel
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${info.bgColor} ${info.color}`}>
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </span>
                {name === currentLevel && (
                  <span className="text-xs text-yellow-600 font-medium">Current</span>
                )}
              </div>
              <span className="text-gray-500 text-sm">
                {info.max === Infinity ? `${info.min}+` : `${info.min} - ${info.max}`} Blades
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Transaction History</h3>

        {transactions && transactions.length > 0 ? (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.amount > 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <Gift className={`w-5 h-5 ${
                      tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tx.reason || 'Transaction'}</p>
                    <p className="text-sm text-gray-500">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
                <span className={`text-xl font-bold ${
                  tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Earn your first Blades by making a purchase
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function EarnCard({
  icon: Icon,
  title,
  description,
  blades,
  comingSoon,
}: {
  icon: any
  title: string
  description: string
  blades?: number
  comingSoon?: boolean
}) {
  return (
    <div className={`p-5 rounded-xl border ${
      comingSoon ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          comingSoon ? 'bg-gray-100' : 'bg-yellow-50'
        }`}>
          <Icon className={`w-5 h-5 ${comingSoon ? 'text-gray-400' : 'text-yellow-600'}`} />
        </div>
        {blades && !comingSoon && (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
            +{blades} Blades
          </span>
        )}
        {comingSoon && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
            Soon
          </span>
        )}
      </div>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  )
}
