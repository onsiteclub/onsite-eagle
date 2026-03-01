import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import { Download, Share2, QrCode } from 'lucide-react'

export const metadata = { title: 'Digital Card | OnSite Club' }

export default async function DigitalCardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('core_profiles')
    .select('full_name, first_name, avatar_url, worker_code, trade_id, experience_years, province, created_at')
    .eq('id', user.id)
    .single()

  // Get trade name
  let tradeName = 'Construction Worker'
  if (profile?.trade_id) {
    const { data: trade } = await supabase
      .from('ref_trades')
      .select('name_en')
      .eq('id', profile.trade_id)
      .single()
    if (trade) tradeName = trade.name_en
  }

  // Career stats
  const [hoursResult, photosResult] = await Promise.all([
    supabase
      .from('tmk_entries')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('frm_photos')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', user.id),
  ])

  const totalHours = Math.round(
    (hoursResult.data?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) ?? 0) / 60
  )
  const totalPhotos = photosResult.count ?? 0

  // Experience level
  const years = profile?.experience_years ?? 0
  let level = 'Apprentice'
  if (totalHours > 5000 && years > 5) level = 'Master'
  else if (totalHours > 2000 && years > 2) level = 'Journeyman'

  const memberSince = profile?.created_at
    ? new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric' }).format(new Date(profile.created_at))
    : 'N/A'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Digital Card</h1>
        <p className="text-[#667085] mt-1">Your professional construction worker ID</p>
      </div>

      {/* Card */}
      <div className="bg-gradient-to-br from-[#0F766E] to-[#042f2c] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start gap-5 mb-6">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-white/20" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl font-bold">
              {getInitials(profile?.full_name)}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{profile?.full_name || 'Member'}</h2>
            <p className="text-teal-200">{tradeName} | {level}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-teal-300 text-xs uppercase tracking-wide">Worker Code</p>
            <p className="font-mono font-bold text-lg">{profile?.worker_code || 'N/A'}</p>
          </div>
          <div>
            <p className="text-teal-300 text-xs uppercase tracking-wide">Member Since</p>
            <p className="font-semibold">{memberSince}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xl font-bold">{totalHours.toLocaleString()}</p>
            <p className="text-teal-200 text-xs">Hours</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xl font-bold">{totalPhotos.toLocaleString()}</p>
            <p className="text-teal-200 text-xs">Photos</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xl font-bold">{years}</p>
            <p className="text-teal-200 text-xs">Years Exp.</p>
          </div>
        </div>

        {/* QR Code placeholder */}
        <div className="flex items-center justify-center">
          <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center">
            <QrCode className="w-16 h-16 text-[#0F766E]" />
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-teal-200 text-xs tracking-widest uppercase">OnSite Club | {profile?.province || 'Canada'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-[#101828] hover:bg-gray-50 transition-colors">
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-[#101828] hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>
    </div>
  )
}
