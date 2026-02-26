import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Smartphone, Monitor, Tablet } from 'lucide-react'
import { DeviceManager } from '@/components/account/DeviceManager'

export const metadata = { title: 'Devices | OnSite Club' }

export default async function DevicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: devices } = await supabase
    .from('core_devices')
    .select('*')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('last_active_at', { ascending: false })

  const primaryDevice = devices?.find(d => d.is_primary) ?? null

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Devices</h1>
        <p className="text-[#667085] mt-1">Manage linked devices</p>
      </div>

      {/* Primary Device */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-[#101828]">Primary Device</h2>
        </div>

        <DeviceManager
          deviceId={primaryDevice?.device_id ?? null}
          deviceModel={primaryDevice?.model ?? null}
          devicePlatform={primaryDevice?.platform ?? null}
          deviceRegisteredAt={primaryDevice?.first_seen_at ?? null}
        />
      </div>

      {/* All Devices */}
      {devices && devices.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#101828] mb-4">All Devices</h2>
          <div className="space-y-3">
            {devices.map(device => {
              const Icon = device.platform === 'web' ? Monitor :
                           device.platform === 'ios' ? Tablet : Smartphone
              return (
                <div key={device.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-[#101828]">
                        {device.model || device.device_name || 'Unknown device'}
                        {device.is_primary && (
                          <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">Primary</span>
                        )}
                      </p>
                      <p className="text-xs text-[#667085]">
                        {device.platform} · {device.app_name || 'Unknown app'} {device.app_version || ''}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[#667085]">
                    {device.last_active_at
                      ? new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(device.last_active_at))
                      : '—'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
