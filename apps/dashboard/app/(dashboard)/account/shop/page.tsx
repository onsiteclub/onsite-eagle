import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { ShoppingBag, Award, ExternalLink, Gift, Users, TrendingUp } from 'lucide-react'

export const metadata = {
  title: 'Loja',
}

export default async function ShopPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('blades_balance, blades_lifetime_earned, level')
    .eq('id', user.id)
    .single()

  // Buscar últimas transações de Blades
  const { data: transactions } = await supabase
    .from('blades_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const shopifyUrl = process.env.NEXT_PUBLIC_SHOPIFY_URL || 'https://onsite.ca/shop'

  const levelInfo: Record<string, { min: number; max: number; color: string }> = {
    rookie: { min: 0, max: 99, color: 'bg-gray-100 text-gray-700' },
    apprentice: { min: 100, max: 499, color: 'bg-blue-100 text-blue-700' },
    journeyman: { min: 500, max: 999, color: 'bg-green-100 text-green-700' },
    master: { min: 1000, max: 4999, color: 'bg-purple-100 text-purple-700' },
    legend: { min: 5000, max: Infinity, color: 'bg-yellow-100 text-yellow-700' },
  }

  const currentLevel = profile?.level || 'rookie'
  const level = levelInfo[currentLevel]

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Loja OnSite</h1>
        <p className="text-gray-600 mt-1">
          Uniformes, EPIs e equipamentos para construção
        </p>
      </div>

      {/* Blades Balance Card */}
      <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Blades Rewards</h2>
            </div>
            <p className="text-yellow-100 text-sm">
              Seu saldo de pontos de fidelidade
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold">{profile?.blades_balance || 0}</p>
            <p className="text-yellow-100 text-sm mt-1">Blades</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 gap-6">
          <div>
            <p className="text-yellow-100 text-sm">Ganhos Total</p>
            <p className="text-2xl font-bold">{profile?.blades_lifetime_earned || 0}</p>
          </div>
          <div>
            <p className="text-yellow-100 text-sm">Nível</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${level.color}`}>
                {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* How to Earn */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Como Ganhar Blades</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EarnCard
            icon={ShoppingBag}
            title="1ª Compra"
            description="Ganhe 2 Blades na sua primeira compra"
            blades={2}
          />
          <EarnCard
            icon={Users}
            title="Indicação"
            description="Ganhe 2 Blades por cada amigo indicado"
            blades={2}
          />
          <EarnCard
            icon={TrendingUp}
            title="Em breve"
            description="Mais formas de ganhar Blades"
            blades={0}
            disabled
          />
        </div>
      </div>

      {/* Shop CTA */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Visite Nossa Loja</h3>
            <p className="text-gray-500 text-sm mt-1">
              Uniformes, EPIs e equipamentos de qualidade
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-brand-600" />
          </div>
        </div>
        <a
          href={shopifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors"
        >
          Ir para Loja
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Transaction History */}
      {transactions && transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">
            Histórico de Blades
          </h3>
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
                    <p className="font-medium text-gray-900">{tx.reason}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`text-lg font-bold ${
                  tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EarnCard({
  icon: Icon,
  title,
  description,
  blades,
  disabled = false,
}: {
  icon: any
  title: string
  description: string
  blades: number
  disabled?: boolean
}) {
  return (
    <div className={`p-4 rounded-xl border ${
      disabled ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          disabled ? 'bg-gray-100' : 'bg-brand-50'
        }`}>
          <Icon className={`w-5 h-5 ${disabled ? 'text-gray-400' : 'text-brand-600'}`} />
        </div>
        {!disabled && blades > 0 && (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
            +{blades} Blades
          </span>
        )}
      </div>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  )
}
