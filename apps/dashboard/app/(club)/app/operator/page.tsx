import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Truck, Package, AlertCircle, CheckCircle2, Camera } from 'lucide-react'
import { StatBox } from '@/components/ui/StatBox'

export const metadata = { title: 'Operator | OnSite Club' }

export default async function OperatorAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch delivery-related timeline events and photos
  const [deliveryResult, photosResult, incidentResult] = await Promise.all([
    supabase
      .from('egl_timeline')
      .select('id, event_type, title, created_at', { count: 'exact' })
      .eq('created_by', user.id)
      .in('event_type', ['delivery', 'material_delivery', 'status_change'])
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('egl_photos')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', user.id),
    supabase
      .from('egl_issues')
      .select('id', { count: 'exact', head: true })
      .eq('reported_by', user.id),
  ])

  const totalDeliveries = deliveryResult.count ?? 0
  const totalPhotos = photosResult.count ?? 0
  const totalIncidents = incidentResult.count ?? 0
  const recentDeliveries = deliveryResult.data ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Operator</h1>
        <p className="text-[#667085] mt-1">Material deliveries & site operations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox variant="card" icon={<Truck className="w-5 h-5 text-blue-500" />} value={totalDeliveries.toString()} label="Deliveries" />
        <StatBox variant="card" icon={<Camera className="w-5 h-5 text-green-500" />} value={totalPhotos.toString()} label="Photos" />
        <StatBox variant="card" icon={<AlertCircle className="w-5 h-5 text-red-500" />} value={totalIncidents.toString()} label="Incidents" />
        <StatBox variant="card" icon={<CheckCircle2 className="w-5 h-5 text-teal-500" />} value="—" label="Completed" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Recent Activity</h2>
        {recentDeliveries.length === 0 ? (
          <div className="text-center py-8">
            <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-[#667085] text-sm">No delivery activity yet. Use the Operator app to track deliveries.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDeliveries.map(event => (
              <div key={event.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#101828]">{event.title}</p>
                  <p className="text-xs text-[#667085]">
                    {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(event.created_at))}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {event.event_type.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
