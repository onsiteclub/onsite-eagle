import { createClient } from '@onsite/supabase/server'
import { getInitials, getSubscriptionBadge } from '@/lib/utils'
import { Bell } from 'lucide-react'
import Link from 'next/link'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('nome, email, subscription_status')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const badge = getSubscriptionBadge(profile?.subscription_status || 'none')

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <div />

      <div className="flex items-center gap-4">
        {/* Subscription Badge */}
        <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <Link href="/account/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
            {getInitials(profile?.nome)}
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-gray-900">
              {profile?.nome || 'User'}
            </p>
            <p className="text-xs text-gray-500">{profile?.email || user?.email}</p>
          </div>
        </Link>
      </div>
    </header>
  )
}
