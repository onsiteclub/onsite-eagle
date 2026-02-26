import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, getInitials, getLevelColor } from '@/lib/utils'
import { Mail, Calendar, Award } from 'lucide-react'
import { EditProfileForm } from '@/components/forms/EditProfileForm'
import type { ProfileWithSubscription, UserLevel } from '@/lib/supabase/types'

export const metadata = { title: 'Profile | OnSite Club' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: coreProfile } = await supabase
    .from('core_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: bladesData } = await supabase
    .from('blades_transactions')
    .select('amount')
    .eq('user_id', user.id)

  const bladesBalance = bladesData?.reduce((sum, t) => sum + t.amount, 0) ?? 0
  const bladesLifetime = bladesData?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) ?? 0

  const getUserLevel = (blades: number): UserLevel => {
    if (blades >= 10000) return 'legend'
    if (blades >= 5000) return 'master'
    if (blades >= 1000) return 'journeyman'
    if (blades >= 100) return 'apprentice'
    return 'rookie'
  }

  const profile: ProfileWithSubscription | null = coreProfile ? {
    ...coreProfile,
    blades_balance: bladesBalance,
    blades_lifetime_earned: bladesLifetime,
    level: getUserLevel(bladesLifetime),
  } : null

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.full_name || user.email || 'User'

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">My Profile</h1>
        <p className="text-[#667085] mt-1">Manage your personal information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-brand-500 to-brand-600" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg bg-brand-100 flex items-center justify-center">
                <span className="text-3xl font-bold text-brand-700">{getInitials(displayName)}</span>
              </div>
            )}
            <div className="flex-1 sm:mb-2">
              <h2 className="text-2xl font-bold text-[#101828]">{displayName}</h2>
              <p className="text-[#667085]">{user.email}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(profile?.level || 'rookie')}`}>
              <Award className="w-4 h-4 inline mr-1" />
              {(profile?.level || 'rookie').charAt(0).toUpperCase()}{(profile?.level || 'rookie').slice(1)}
            </span>
          </div>
        </div>
      </div>

      <EditProfileForm profile={profile} />

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-[#101828] mb-5">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoItem icon={Mail} label="Email" value={user.email || '-'} />
          <InfoItem icon={Calendar} label="Member since" value={formatDate(profile?.created_at || user.created_at || '')} />
          <InfoItem icon={Award} label="Lifetime Blades" value={`${profile?.blades_lifetime_earned || 0} Blades`} />
          <InfoItem icon={Calendar} label="Last seen" value={profile?.last_active_at ? formatDate(profile.last_active_at) : 'Now'} />
        </div>
      </div>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div>
        <p className="text-sm text-[#667085]">{label}</p>
        <p className="font-medium text-[#101828]">{value}</p>
      </div>
    </div>
  )
}
