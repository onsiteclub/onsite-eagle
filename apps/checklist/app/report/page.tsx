'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@onsite/supabase/client'
import EditableReportView from '@/components/EditableReportView'

interface ReportData {
  id: string
  token: string
  expires_at: string | null
  items: Array<Record<string, unknown>>
  [key: string]: unknown
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
      <div className="text-[15px] text-[#888884]">Loading report...</div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ReportContent />
    </Suspense>
  )
}

function ReportContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [report, setReport] = useState<ReportData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!token) {
      setNotFound(true)
      return
    }

    const supabase = createClient()
    let cancelled = false

    async function load() {
      const { data: reportRow, error } = await supabase
        .from('frm_shared_reports')
        .select('*')
        .eq('token', token)
        .single()

      if (cancelled) return

      if (error || !reportRow) {
        setNotFound(true)
        return
      }

      if (reportRow.expires_at && new Date(reportRow.expires_at) < new Date()) {
        setExpired(true)
        return
      }

      const { data: items } = await supabase
        .from('frm_shared_report_items')
        .select('*')
        .eq('report_id', reportRow.id)
        .order('sort_order', { ascending: true })

      if (cancelled) return

      setReport({ ...reportRow, items: items ?? [] })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token])

  if (expired) {
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

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-[#1A1A1A] mb-2">Report Not Found</h1>
          <p className="text-[15px] text-[#888884]">The report you are looking for does not exist.</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <div className="text-[15px] text-[#888884]">Loading report...</div>
      </div>
    )
  }

  return <EditableReportView report={report as never} />
}
