import { createServerSupabaseClient } from '@onsite/supabase'
import { notFound } from 'next/navigation'
import EditableReportView from '@/components/EditableReportView'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ReportPage({ params }: Props) {
  const { token } = await params
  const supabase = await createServerSupabaseClient()

  const { data: report, error } = await supabase
    .from('frm_shared_reports')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !report) {
    notFound()
  }

  // Check expiration
  if (report.expires_at && new Date(report.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4 text-[#B0AFA9]">&#128274;</div>
          <h1 className="text-lg font-bold text-[#1A1A1A] mb-2">Report Expired</h1>
          <p className="text-[15px] text-[#888884]">This report link has expired and is no longer available.</p>
        </div>
      </div>
    )
  }

  const { data: items } = await supabase
    .from('frm_shared_report_items')
    .select('*')
    .eq('report_id', report.id)
    .order('sort_order', { ascending: true })

  return (
    <EditableReportView
      report={{
        ...report,
        items: items || [],
      }}
    />
  )
}
