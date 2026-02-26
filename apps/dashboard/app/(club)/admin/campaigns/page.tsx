import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Megaphone, Plus, Calendar, Users } from 'lucide-react'

export const metadata = { title: 'Campaigns | Admin | OnSite Club' }

export default async function AdminCampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: admin } = await supabase
    .from('core_admin_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!admin) redirect('/club')

  // Campaigns table may not exist yet — graceful handling
  let campaigns: any[] = []
  try {
    const { data } = await supabase
      .from('club_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    campaigns = data ?? []
  } catch {
    // Table doesn't exist yet
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Campaigns</h1>
          <p className="text-[#667085] mt-1">Manage promotions, news, and badge challenges</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-[#101828] mb-1">No campaigns yet</h3>
          <p className="text-[#667085] text-sm mb-4">Create your first campaign to engage club members with promotions and challenges.</p>
          <button className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="space-y-3">
            {campaigns.map((campaign: any) => (
              <div key={campaign.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#101828]">{campaign.title_en || campaign.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[#667085] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {campaign.start_date ? new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(campaign.start_date)) : '—'}
                    </span>
                    <span className="text-xs text-[#667085] flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {campaign.target_tiers || 'All tiers'}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  campaign.status === 'active' ? 'bg-green-50 text-green-700' :
                  campaign.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                  'bg-red-50 text-red-700'
                }`}>
                  {campaign.status || 'draft'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
