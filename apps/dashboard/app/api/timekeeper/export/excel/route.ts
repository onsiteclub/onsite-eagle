import { createClient } from '@onsite/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import type { TimekeeperEntry, ProfileWithSubscription } from '@/lib/supabase/types'

interface ExportRequest {
  entries: TimekeeperEntry[]
  profile: ProfileWithSubscription
  dateRange: { start: string; end: string }
  stats: {
    totalMinutos: number
    diasTrabalhados: number
    totalSessoes: number
    locaisUsados: string[]
    registrosEditados: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entries, profile, dateRange, stats }: ExportRequest = await request.json()

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Get display name
    const displayName = profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.full_name || profile.email

    // Sheet 1: Summary
    const summaryData = [
      ['OnSite Timekeeper - Work Hours Report'],
      [''],
      ['Worker', displayName],
      ['Period', `${new Date(dateRange.start).toLocaleDateString('en-CA')} - ${new Date(dateRange.end).toLocaleDateString('en-CA')}`],
      [''],
      ['Summary'],
      ['Total Hours', formatMinutesToHours(stats.totalMinutos)],
      ['Days Worked', stats.diasTrabalhados],
      ['Sessions', stats.totalSessoes],
      ['Locations', stats.locaisUsados.join(', ')],
      ['Edited Records', stats.registrosEditados],
      [''],
      ['Generated', new Date().toLocaleString('en-CA')],
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)

    // Set column widths
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }]

    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

    // Sheet 2: Records
    const recordsData = [
      ['Location', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Edited'],
      ...entries.map((entry) => {
        const entryAt = new Date(entry.entry_at)
        const exitAt = entry.exit_at ? new Date(entry.exit_at) : null
        const duration = exitAt
          ? Math.round((exitAt.getTime() - entryAt.getTime()) / 60000)
          : null

        return [
          entry.location_name || 'Unknown',
          entryAt.toLocaleDateString('en-CA'),
          entryAt.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }),
          exitAt ? exitAt.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'In progress',
          duration ? formatMinutesToHours(duration) : '-',
          entry.manually_edited ? 'Yes' : 'No'
        ]
      })
    ]

    const recordsSheet = XLSX.utils.aoa_to_sheet(recordsData)

    // Set column widths
    recordsSheet['!cols'] = [
      { wch: 25 }, // Location
      { wch: 12 }, // Date
      { wch: 10 }, // Clock In
      { wch: 10 }, // Clock Out
      { wch: 12 }, // Duration
      { wch: 8 },  // Edited
    ]

    XLSX.utils.book_append_sheet(wb, recordsSheet, 'Records')

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="timekeeper-report.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 })
  }
}

function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}
