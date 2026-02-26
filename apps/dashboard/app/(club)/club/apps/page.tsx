import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { getAppStats } from '@/lib/queries/hub-stats'
import Link from 'next/link'
import {
  Clock,
  Calculator,
  Camera,
  Eye,
  Truck,
  ClipboardCheck,
  ShoppingBag,
  Monitor,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'

export const metadata = { title: 'My Apps | OnSite Club' }

interface AppDef {
  slug: string
  name: string
  subtitle: string
  description: string
  icon: any
  color: string
  href: string
  external?: boolean
  planned?: boolean
  supervisorOnly?: boolean
}

const apps: AppDef[] = [
  { slug: 'timekeeper', name: 'Timekeeper', subtitle: 'Hours tracking', description: 'GPS geofencing, auto clock-in/out', icon: Clock, color: 'blue', href: '/app/timekeeper' },
  { slug: 'calculator', name: 'Calculator', subtitle: 'Voice calculations', description: 'Construction calculator with voice input', icon: Calculator, color: 'purple', href: '/app/calculator' },
  { slug: 'field', name: 'Field', subtitle: 'Site documentation', description: 'Photo documentation of construction sites', icon: Camera, color: 'green', href: '/app/field' },
  { slug: 'eagle', name: 'Eagle', subtitle: 'Visual inspection', description: 'AI-powered phase inspection and tracking', icon: Eye, color: 'teal', href: '/app/eagle' },
  { slug: 'operator', name: 'Operator', subtitle: 'Logistics', description: 'Material delivery and QR scanning', icon: Truck, color: 'amber', href: '/app/operator' },
  { slug: 'inspect', name: 'Inspect', subtitle: 'Phase approval', description: 'Inspect and approve construction phases', icon: ClipboardCheck, color: 'cyan', href: '/app/inspect' },
  { slug: 'shop', name: 'Shop', subtitle: 'Equipment store', description: 'Uniforms, PPE and tools', icon: ShoppingBag, color: 'orange', href: '/app/shop' },
  { slug: 'monitor', name: 'Monitor', subtitle: 'Supervisor dashboard', description: 'Site overview and team management', icon: Monitor, color: 'slate', href: '/app/eagle', supervisorOnly: true },
  { slug: 'sheetchat', name: 'SheetChat', subtitle: 'Team communication', description: 'Unified messaging for construction crews', icon: MessageSquare, color: 'pink', planned: true, href: '#' },
]

export default async function MyAppsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const appStats = await getAppStats(supabase, user.id)

  function getStatus(slug: string): 'active' | 'available' | 'coming_soon' {
    const stats = appStats[slug as keyof typeof appStats]
    if (!stats) return 'available'
    if ('hasData' in stats && stats.hasData) return 'active'
    return 'available'
  }

  // Sort: active first, then available, then planned
  const sorted = [...apps].sort((a, b) => {
    if (a.planned && !b.planned) return 1
    if (!a.planned && b.planned) return -1
    const sa = getStatus(a.slug)
    const sb = getStatus(b.slug)
    if (sa === 'active' && sb !== 'active') return -1
    if (sa !== 'active' && sb === 'active') return 1
    return 0
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">My Apps</h1>
        <p className="text-[#667085] mt-1">All OnSite Club apps and services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(app => {
          const status = app.planned ? 'coming_soon' : getStatus(app.slug)
          const Icon = app.icon

          if (status === 'coming_soon') {
            return (
              <div key={app.slug} className="bg-gray-50 rounded-xl border border-gray-200 p-5 opacity-60">
                <div className="flex items-start justify-between mb-3">
                  <Icon className="w-6 h-6 text-gray-400" />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-500 uppercase">Coming Soon</span>
                </div>
                <h3 className="font-semibold text-gray-500 mb-0.5">{app.name}</h3>
                <p className="text-xs text-gray-400">{app.description}</p>
              </div>
            )
          }

          return (
            <Link
              key={app.slug}
              href={app.href}
              className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className="w-6 h-6 text-gray-600 group-hover:text-brand-500 transition-colors" />
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                  status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {status === 'active' ? 'Active' : 'Available'}
                </span>
              </div>
              <h3 className="font-semibold text-[#101828] mb-0.5">{app.name}</h3>
              <p className="text-xs text-[#667085] mb-3">{app.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-[#667085]">{app.subtitle}</span>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
