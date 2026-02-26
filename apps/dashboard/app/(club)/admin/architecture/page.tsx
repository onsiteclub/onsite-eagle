import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Network, Database, Server, Activity, Box, Layers } from 'lucide-react'

export const metadata = { title: 'Architecture | Admin | OnSite Club' }

interface AppRegistryRow {
  id: string
  app_slug: string
  app_name: string
  runtime: string
  subtitle: string | null
  status: string
  packages: string[]
  description: string | null
  tech_stack: string | null
  color_hex: string | null
  is_external: boolean
  sort_order: number
}

export default async function ArchitecturePage() {
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

  // Fetch app registry from Supabase
  const { data: appRegistry } = await supabase
    .from('egl_app_registry')
    .select('*')
    .order('sort_order')

  const apps = (appRegistry ?? []) as AppRegistryRow[]

  // Fetch real data metrics
  const [
    { count: totalProfiles },
    { count: totalEntries },
    { count: totalCalculations },
    { count: totalPhotos },
    { count: totalSites },
    { count: totalOrders },
  ] = await Promise.all([
    supabase.from('core_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('app_timekeeper_entries').select('*', { count: 'exact', head: true }),
    supabase.from('app_calculator_calculations').select('*', { count: 'exact', head: true }),
    supabase.from('egl_photos').select('*', { count: 'exact', head: true }),
    supabase.from('egl_sites').select('*', { count: 'exact', head: true }),
    supabase.from('shp_orders').select('*', { count: 'exact', head: true }),
  ])

  const dataMetrics = [
    { app: 'Core', table: 'core_profiles', records: totalProfiles ?? 0 },
    { app: 'Timekeeper', table: 'app_timekeeper_entries', records: totalEntries ?? 0 },
    { app: 'Calculator', table: 'app_calculator_calculations', records: totalCalculations ?? 0 },
    { app: 'Eagle', table: 'egl_photos', records: totalPhotos ?? 0 },
    { app: 'Eagle', table: 'egl_sites', records: totalSites ?? 0 },
    { app: 'Shop', table: 'shp_orders', records: totalOrders ?? 0 },
  ]

  const totalRecords = dataMetrics.reduce((sum, m) => sum + m.records, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">System Architecture</h1>
        <p className="text-[#667085] mt-1">OnSite Club ecosystem overview</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={<Box className="w-5 h-5 text-blue-500" />} value={apps.length.toString()} label="Apps" />
        <StatBox icon={<Layers className="w-5 h-5 text-purple-500" />} value={Array.from(new Set(apps.flatMap(a => a.packages || []))).length.toString()} label="Packages" />
        <StatBox icon={<Database className="w-5 h-5 text-green-500" />} value={totalRecords.toLocaleString()} label="Total records" />
        <StatBox icon={<Server className="w-5 h-5 text-teal-500" />} value="1" label="Supabase project" />
      </div>

      {/* Hourglass Diagram */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-brand-500" />
          Hourglass Architecture
        </h2>
        <div className="text-center space-y-4">
          {/* Top — Collection */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Collection Layer</p>
            <div className="flex flex-wrap justify-center gap-2">
              {apps.filter(a => a.status === 'live' && !['monitor', 'analytics', 'dashboard', 'auth'].includes(a.app_slug)).map(app => (
                <span key={app.app_slug} className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-[#101828] border border-blue-200">
                  {app.app_name}
                </span>
              ))}
            </div>
          </div>

          <div className="text-gray-300 text-2xl">▼</div>

          {/* Center — Supabase */}
          <div className="bg-teal-50 rounded-xl p-4 max-w-md mx-auto">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-2">Centralization</p>
            <p className="text-sm font-medium text-[#101828]">Supabase PostgreSQL</p>
            <p className="text-xs text-[#667085]">{totalRecords.toLocaleString()} records · RLS · Auth</p>
          </div>

          <div className="text-gray-300 text-2xl">▼</div>

          {/* Bottom — Intelligence */}
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">Intelligence Layer</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Analytics', 'Monitor', 'Dashboard', 'Prumo AI (2027)'].map(name => (
                <span key={name} className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-[#101828] border border-amber-200">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* App Registry */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">App Registry</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-[#667085]">App</th>
                <th className="text-left py-3 px-2 font-medium text-[#667085]">Stack</th>
                <th className="text-left py-3 px-2 font-medium text-[#667085]">Description</th>
                <th className="text-left py-3 px-2 font-medium text-[#667085]">Status</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.app_slug} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {app.color_hex && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: app.color_hex }} />}
                      <span className="font-medium text-[#101828]">{app.app_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-[#667085]">{app.tech_stack || app.runtime}</td>
                  <td className="py-3 px-2 text-[#667085]">{app.description}</td>
                  <td className="py-3 px-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      app.status === 'live' ? 'bg-green-50 text-green-700' :
                      app.status === 'dev' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Metrics */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Data Metrics (Live)</h2>
        <div className="space-y-3">
          {dataMetrics.filter(m => m.records > 0).map(m => (
            <div key={m.table} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-[#101828]">{m.app}</p>
                <p className="text-xs text-[#667085] font-mono">{m.table}</p>
              </div>
              <span className="text-sm font-semibold text-[#101828]">{m.records.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Packages */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-[#101828] mb-4">Shared Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from(new Set(apps.flatMap(a => a.packages || []))).sort().map(pkg => {
            const usedBy = apps.filter(a => a.packages?.includes(pkg)).length
            return (
              <div key={pkg} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                <span className="text-sm font-mono text-brand-600">@onsite/{pkg}</span>
                <span className="text-xs text-[#667085]">Used by {usedBy} apps</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-lg font-bold text-[#101828] leading-tight">{value}</p>
        <p className="text-xs text-[#667085]">{label}</p>
      </div>
    </div>
  )
}
