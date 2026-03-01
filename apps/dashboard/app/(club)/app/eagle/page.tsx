import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Eye, Home, Camera, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { StatBox } from '@/components/ui/StatBox'

export const metadata = { title: 'Eagle | OnSite Club' }

export default async function EagleAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: sites }, { data: photos }, { count: issueCount }] = await Promise.all([
    supabase
      .from('frm_jobsites')
      .select('id, name, total_lots, completed_lots, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('frm_photos')
      .select('id, ai_validation_status, created_at')
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('frm_house_items')
      .select('*', { count: 'exact', head: true })
      .eq('reported_by', user.id)
      .eq('status', 'open'),
  ])

  const totalPhotos = photos?.length ?? 0
  const approvedPhotos = photos?.filter(p => p.ai_validation_status === 'approved').length ?? 0
  const approvalRate = totalPhotos > 0 ? Math.round((approvedPhotos / totalPhotos) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Eagle</h1>
        <p className="text-[#667085] mt-1">Visual inspection & progress tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox variant="card" icon={<Eye className="w-5 h-5 text-teal-500" />} value={(sites?.length ?? 0).toString()} label="Active sites" />
        <StatBox variant="card" icon={<Camera className="w-5 h-5 text-blue-500" />} value={totalPhotos.toString()} label="Photos uploaded" />
        <StatBox variant="card" icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} value={`${approvalRate}%`} label="AI approval rate" />
        <StatBox variant="card" icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} value={(issueCount ?? 0).toString()} label="Open issues" />
      </div>

      {/* Sites */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Sites</h2>
        {!sites || sites.length === 0 ? (
          <p className="text-[#667085] text-sm text-center py-6">No sites assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {sites.map(site => {
              const progress = site.total_lots > 0
                ? Math.round((site.completed_lots / site.total_lots) * 100)
                : 0
              return (
                <div key={site.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Home className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#101828]">{site.name}</p>
                      <p className="text-xs text-[#667085]">{site.completed_lots}/{site.total_lots} lots completed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-sm font-medium text-[#667085] w-10 text-right">{progress}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Photos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Recent Photos</h2>
        {!photos || photos.length === 0 ? (
          <p className="text-[#667085] text-sm text-center py-6">No photos uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {photos.slice(0, 10).map(photo => (
              <div key={photo.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-[#101828]">
                    {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(photo.created_at))}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  photo.ai_validation_status === 'approved' ? 'bg-green-50 text-green-700' :
                  photo.ai_validation_status === 'rejected' ? 'bg-red-50 text-red-700' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  {photo.ai_validation_status || 'pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

