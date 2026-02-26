import { getInitials, getSubscriptionBadge } from '@/lib/utils'
import { Bell, Award } from 'lucide-react'
import Link from 'next/link'

interface ClubHeaderProps {
  profile: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
    subscription_status: string
    blades_balance: number
  } | null
}

export function ClubHeader({ profile }: ClubHeaderProps) {
  const badge = getSubscriptionBadge(profile?.subscription_status || 'none')

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <div />

      <div className="flex items-center gap-3">
        {/* Blades Balance */}
        <Link
          href="/club/rewards"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
        >
          <Award className="w-3.5 h-3.5" />
          <span>{profile?.blades_balance ?? 0} Blades</span>
        </Link>

        {/* Subscription Badge */}
        <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-[18px] h-[18px]" />
        </button>

        {/* Avatar */}
        <Link href="/account/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs">
              {getInitials(profile?.full_name)}
            </div>
          )}
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {profile?.full_name || 'User'}
            </p>
          </div>
        </Link>
      </div>
    </header>
  )
}
