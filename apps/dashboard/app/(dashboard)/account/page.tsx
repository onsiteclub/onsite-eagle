import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { formatMinutesToHours, getFirstName } from '@/lib/utils'
import { 
  Clock, 
  Calculator, 
  ShoppingBag, 
  BookOpen, 
  ClipboardCheck, 
  Award,
  ArrowRight,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard',
}

export default async function AccountHubPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Stats for Timekeeper (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: registros } = await supabase
    .from('registros')
    .select('entrada, saida')
    .eq('user_id', user.id)
    .gte('entrada', thirtyDaysAgo.toISOString())

  let totalMinutes = 0
  const sessionsCount = registros?.length || 0
  registros?.forEach(reg => {
    if (reg.saida) {
      const entrada = new Date(reg.entrada).getTime()
      const saida = new Date(reg.saida).getTime()
      totalMinutes += Math.round((saida - entrada) / 60000)
    }
  })

  // Calculate trial days remaining
  let trialDaysRemaining = 0
  if (profile?.subscription_status === 'trialing' && profile?.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at)
    const now = new Date()
    trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const shopifyUrl = process.env.NEXT_PUBLIC_SHOPIFY_URL || 'https://onsite.ca/shop'

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {getFirstName(profile?.nome)}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Access your OnSite tools and services
        </p>
      </div>

      {/* Trial Banner */}
      {profile?.subscription_status === 'trialing' && trialDaysRemaining > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">🎉 Free Trial Active</p>
              <p className="text-blue-100 text-sm mt-1">
                {trialDaysRemaining} days remaining • Add payment method to keep access
              </p>
            </div>
            <Link
              href="/account/settings"
              className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              Manage
            </Link>
          </div>
        </div>
      )}

      {/* App Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Timekeeper */}
        <AppCard
          href="/account/timekeeper"
          icon={Clock}
          title="Timekeeper"
          description="Track your work hours automatically"
          stats={[
            { label: 'This Month', value: formatMinutesToHours(totalMinutes) },
            { label: 'Sessions', value: sessionsCount.toString() },
          ]}
          color="blue"
        />

        {/* Calculator */}
        <AppCard
          href="/account/calculator"
          icon={Calculator}
          title="Voice Calculator"
          description="Construction calculator with voice input"
          stats={[
            { label: 'Voice', value: profile?.voice_calculator_enabled ? 'Enabled' : 'Locked' },
            { label: 'Status', value: profile?.subscription_status === 'trialing' ? 'Trial' : 'Active' },
          ]}
          color="purple"
        />

        {/* Shop */}
        <AppCard
          href={shopifyUrl}
          icon={ShoppingBag}
          title="Shop"
          description="Uniforms, PPE & equipment"
          stats={[
            { label: 'Blades', value: (profile?.blades_balance || 0).toString() },
          ]}
          color="green"
          external
        />

        {/* Courses & Training */}
        <AppCard
          href="/account/courses"
          icon={BookOpen}
          title="Courses & Training"
          description="Professional development courses"
          comingSoon
          color="orange"
        />

        {/* Checklist */}
        <AppCard
          href="/account/checklist"
          icon={ClipboardCheck}
          title="Checklist"
          description="Safety and inspection checklists"
          comingSoon
          color="teal"
        />

        {/* Blades */}
        <AppCard
          href="/account/blades"
          icon={Award}
          title="Blades Rewards"
          description="Your loyalty points and rewards"
          stats={[
            { label: 'Balance', value: (profile?.blades_balance || 0).toString() },
            { label: 'Level', value: (profile?.level || 'rookie').charAt(0).toUpperCase() + (profile?.level || 'rookie').slice(1) },
          ]}
          color="yellow"
        />
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Subscription</p>
            <p className="font-semibold text-gray-900 capitalize">
              {profile?.subscription_status || 'None'} 
              {profile?.subscription_status === 'trialing' && ` • ${trialDaysRemaining} days left`}
            </p>
          </div>
          <Link
            href="/account/settings"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
          >
            Manage subscription
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

interface AppCardProps {
  href: string
  icon: any
  title: string
  description: string
  stats?: { label: string; value: string }[]
  color: 'blue' | 'purple' | 'green' | 'orange' | 'teal' | 'yellow'
  comingSoon?: boolean
  external?: boolean
}

function AppCard({ href, icon: Icon, title, description, stats, color, comingSoon, external }: AppCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    teal: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100',
    yellow: 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100',
  }

  const borderHover = {
    blue: 'hover:border-blue-300',
    purple: 'hover:border-purple-300',
    green: 'hover:border-green-300',
    orange: 'hover:border-orange-300',
    teal: 'hover:border-teal-300',
    yellow: 'hover:border-yellow-300',
  }

  const Component = external ? 'a' : Link
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  if (comingSoon) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 opacity-60">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center`}>
            <Icon className="w-7 h-7 text-gray-400" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
            Coming Soon
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-500 mb-1">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    )
  }

  return (
    <Component
      href={href}
      {...linkProps}
      className={`group bg-white rounded-2xl border border-gray-200 p-6 transition-all hover:shadow-lg ${borderHover[color]}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${colorClasses[color]}`}>
          <Icon className="w-7 h-7" />
        </div>
        {external && (
          <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-gray-700">
        {title}
      </h3>
      <p className="text-gray-500 text-sm mb-4">{description}</p>
      
      {stats && stats.length > 0 && (
        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className="font-semibold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-gray-600 group-hover:text-gray-900">
        {external ? 'Visit' : 'Open'}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Component>
  )
}
