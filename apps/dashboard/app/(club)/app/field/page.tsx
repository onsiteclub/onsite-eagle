import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Camera, MapPin, CheckCircle2, FileImage } from 'lucide-react'
import { StatBox } from '@/components/ui/StatBox'

export const metadata = { title: 'Field | OnSite Club' }

export default async function FieldAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: photos }, { count: totalPhotos }] = await Promise.all([
    supabase
      .from('frm_photos')
      .select('id, ai_validation_status, photo_type, created_at')
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('frm_photos')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by', user.id),
  ])

  const approvedCount = photos?.filter(p => p.ai_validation_status === 'approved').length ?? 0
  const pendingCount = photos?.filter(p => !p.ai_validation_status || p.ai_validation_status === 'pending').length ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Field</h1>
        <p className="text-[#667085] mt-1">Site documentation & photo capture</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatBox variant="card" icon={<FileImage className="w-5 h-5 text-green-500" />} value={(totalPhotos ?? 0).toString()} label="Total photos" />
        <StatBox variant="card" icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />} value={approvedCount.toString()} label="Approved" />
        <StatBox variant="card" icon={<Camera className="w-5 h-5 text-amber-500" />} value={pendingCount.toString()} label="Pending review" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Recent Uploads</h2>
        {!photos || photos.length === 0 ? (
          <p className="text-[#667085] text-sm text-center py-6">No photos uploaded yet. Use the Field app to start documenting.</p>
        ) : (
          <div className="space-y-2">
            {photos.map(photo => (
              <div key={photo.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <Camera className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-[#101828] capitalize">{(photo.photo_type || 'photo').replace(/_/g, ' ')}</p>
                    <p className="text-xs text-[#667085]">
                      {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(photo.created_at))}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  photo.ai_validation_status === 'approved' ? 'bg-green-50 text-green-700' :
                  photo.ai_validation_status === 'rejected' ? 'bg-red-50 text-red-700' :
                  'bg-amber-50 text-amber-700'
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

