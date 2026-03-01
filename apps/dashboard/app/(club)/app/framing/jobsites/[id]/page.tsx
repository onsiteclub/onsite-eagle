import { createClient } from '@onsite/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getJobsiteWithStats } from '@onsite/framing'
import { MapPin, Calendar, Building2, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { JobsiteActions } from '@/components/framing/JobsiteActions'
import { LotGrid } from '@/components/framing/LotGrid'

interface Props {
  params: Promise<{ id: string }>
}

export default async function JobsiteDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  let jobsite: Awaited<ReturnType<typeof getJobsiteWithStats>>
  try {
    jobsite = await getJobsiteWithStats(supabase, id)
  } catch {
    notFound()
  }

  const lots = jobsite.lots ?? []

  // Stats by status
  const statusCounts: Record<string, number> = {}
  for (const lot of lots) {
    statusCounts[lot.status] = (statusCounts[lot.status] ?? 0) + 1
  }

  const formatDate = (date: string | null) => {
    if (!date) return '--'
    return new Intl.DateTimeFormat('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  }

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700'
      case 'released': return 'bg-blue-50 text-blue-700'
      case 'in_progress': return 'bg-yellow-50 text-yellow-700'
      case 'completed': return 'bg-green-50 text-green-700'
      case 'paused_for_trades': return 'bg-orange-50 text-orange-700'
      case 'backframe': return 'bg-purple-50 text-purple-700'
      case 'inspection': return 'bg-violet-50 text-violet-700'
      default: return 'bg-gray-50 text-gray-600'
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/app/framing/jobsites"
        className="inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#101828] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobsites
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#101828]">{jobsite.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-[#667085]">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {jobsite.builder_name}
                </span>
                <span>{jobsite.city}</span>
                {jobsite.address && <span>{jobsite.address}</span>}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#667085]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Start: {formatDate(jobsite.start_date)}
                </span>
                <span>End: {formatDate(jobsite.expected_end_date)}</span>
              </div>
              {jobsite.lumberyard_notes && (
                <p className="mt-2 text-xs text-[#667085] bg-amber-50 px-3 py-1.5 rounded-lg inline-block">
                  Lumberyard: {jobsite.lumberyard_notes}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              jobsite.status === 'active' ? 'bg-green-50 text-green-700' :
              jobsite.status === 'completed' ? 'bg-blue-50 text-blue-700' :
              jobsite.status === 'on_hold' ? 'bg-amber-50 text-amber-700' :
              'bg-gray-50 text-gray-600'
            }`}>
              {jobsite.status}
            </span>
            <JobsiteActions jobsite={jobsite} />
          </div>
        </div>
      </div>

      {/* Lot Status Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-[#101828]">{lots.length}</p>
          <p className="text-xs text-[#667085]">Total Lots</p>
        </div>
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-[#101828]">{count}</p>
            <p className="text-xs text-[#667085] capitalize">{status.replace(/_/g, ' ')}</p>
          </div>
        ))}
      </div>

      {/* Lots Grid */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <LotGrid
          jobsiteId={jobsite.id}
          initialLots={lots}
          statusBadgeColor={statusBadgeColor}
        />
      </div>
    </div>
  )
}
