import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardCheck, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { StatBox } from '@/components/ui/StatBox'

export const metadata = { title: 'Inspect | OnSite Club' }

export default async function InspectAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch inspection-related progress data
  const [approvedResult, pendingResult, rejectedResult, recentResult] = await Promise.all([
    supabase
      .from('egl_progress')
      .select('id', { count: 'exact', head: true })
      .eq('approved_by', user.id)
      .eq('status', 'approved'),
    supabase
      .from('egl_progress')
      .select('id', { count: 'exact', head: true })
      .in('status', ['in_progress', 'ai_review']),
    supabase
      .from('egl_progress')
      .select('id', { count: 'exact', head: true })
      .eq('approved_by', user.id)
      .eq('status', 'rejected'),
    supabase
      .from('egl_progress')
      .select('id, house_id, status, updated_at, notes')
      .or(`approved_by.eq.${user.id},status.in.(in_progress,ai_review)`)
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  const totalApproved = approvedResult.count ?? 0
  const totalPending = pendingResult.count ?? 0
  const totalRejected = rejectedResult.count ?? 0
  const totalInspections = totalApproved + totalRejected
  const recentItems = recentResult.data ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Inspect</h1>
        <p className="text-[#667085] mt-1">Inspections & quality control</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox variant="card" icon={<ClipboardCheck className="w-5 h-5 text-indigo-500" />} value={totalInspections.toString()} label="Inspections done" />
        <StatBox variant="card" icon={<Clock className="w-5 h-5 text-blue-500" />} value={totalPending.toString()} label="Pending" />
        <StatBox variant="card" icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} value={totalApproved.toString()} label="Approved" />
        <StatBox variant="card" icon={<AlertTriangle className="w-5 h-5 text-red-500" />} value={totalRejected.toString()} label="Rejected" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Recent Inspections</h2>
        {recentItems.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-[#667085] text-sm">No inspection data yet. Approve or review phases in the Inspect app.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentItems.map(item => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#101828]">
                    Phase inspection {item.notes ? `— ${item.notes.slice(0, 50)}` : ''}
                  </p>
                  <p className="text-xs text-[#667085]">
                    {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(item.updated_at))}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  item.status === 'approved' ? 'bg-green-50 text-green-700' :
                  item.status === 'rejected' ? 'bg-red-50 text-red-700' :
                  item.status === 'ai_review' ? 'bg-purple-50 text-purple-700' :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {item.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
