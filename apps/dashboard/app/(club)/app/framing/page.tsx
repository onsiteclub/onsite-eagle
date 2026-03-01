import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { MapPin, Home, Users, ClipboardList, ArrowRight, Building2 } from 'lucide-react'
import { listJobsites, listCrews } from '@onsite/framing'
import { StatBox } from '@/components/ui/StatBox'
import Link from 'next/link'

export const metadata = { title: 'Framing | OnSite Club' }

export default async function FramingHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [jobsites, crews] = await Promise.all([
    listJobsites(supabase).catch(() => []),
    listCrews(supabase).catch(() => []),
  ])

  // Compute stats
  const totalLots = jobsites.reduce((sum, j) => sum + (j.total_lots ?? 0), 0)

  // Get total assignments count across all jobsites
  const { count: totalAssignments } = await supabase
    .from('frm_phase_assignments')
    .select('*', { count: 'exact', head: true })

  const recentJobsites = jobsites.slice(0, 5)

  const quickLinks = [
    { href: '/app/framing/jobsites', label: 'Jobsites', description: 'Manage construction sites', icon: MapPin },
    { href: '/app/framing/crews', label: 'Crews', description: 'Manage framing crews', icon: Users },
    { href: '/app/framing/assignments', label: 'Assignments', description: 'Phase assignments', icon: ClipboardList },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">Framing Operations</h1>
        <p className="text-[#667085] mt-1">Manage jobsites, crews, and phase assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox
          variant="card"
          icon={<MapPin className="w-5 h-5 text-teal-500" />}
          value={jobsites.length.toString()}
          label="Total Jobsites"
        />
        <StatBox
          variant="card"
          icon={<Home className="w-5 h-5 text-blue-500" />}
          value={totalLots.toString()}
          label="Total Lots"
        />
        <StatBox
          variant="card"
          icon={<Users className="w-5 h-5 text-purple-500" />}
          value={crews.length.toString()}
          label="Active Crews"
        />
        <StatBox
          variant="card"
          icon={<ClipboardList className="w-5 h-5 text-amber-500" />}
          value={(totalAssignments ?? 0).toString()}
          label="Assignments"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-teal-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <link.icon className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#101828]">{link.label}</p>
                  <p className="text-xs text-[#667085]">{link.description}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Jobsites */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#101828]">Recent Jobsites</h2>
          {jobsites.length > 5 && (
            <Link href="/app/framing/jobsites" className="text-sm text-teal-600 hover:text-teal-700">
              View all
            </Link>
          )}
        </div>

        {recentJobsites.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-[#667085] text-sm">No jobsites yet. Create your first jobsite to get started.</p>
            <Link
              href="/app/framing/jobsites"
              className="inline-block mt-3 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              Go to Jobsites
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobsites.map(jobsite => {
              const progress = jobsite.total_lots > 0
                ? Math.round((jobsite.completed_lots / jobsite.total_lots) * 100)
                : 0
              return (
                <Link
                  key={jobsite.id}
                  href={`/app/framing/jobsites/${jobsite.id}`}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#101828]">{jobsite.name}</p>
                      <p className="text-xs text-[#667085]">
                        {jobsite.builder_name} &middot; {jobsite.city}
                        {jobsite.total_lots > 0 && ` &middot; ${jobsite.completed_lots}/${jobsite.total_lots} lots`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {jobsite.total_lots > 0 && (
                      <>
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-sm font-medium text-[#667085] w-10 text-right">{progress}%</span>
                      </>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      jobsite.status === 'active' ? 'bg-green-50 text-green-700' :
                      jobsite.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                      jobsite.status === 'on_hold' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {jobsite.status}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
