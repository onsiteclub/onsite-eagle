import { createClient } from '@onsite/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

    // Create PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Brand color (OnSite Amber)
    const brandColor: [number, number, number] = [245, 158, 11]
    const grayDark: [number, number, number] = [55, 65, 81]
    const grayLight: [number, number, number] = [107, 114, 128]

    // Header with logo placeholder
    doc.setFillColor(...brandColor)
    doc.rect(0, 0, pageWidth, 35, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('OnSite Timekeeper', 15, 18)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Work Hours Report', 15, 27)

    // Generated date (right side)
    doc.setFontSize(9)
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      pageWidth - 15,
      27,
      { align: 'right' }
    )

    // Worker info section
    let yPos = 50

    const displayName = profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.full_name || profile.email

    doc.setTextColor(...grayDark)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(displayName, 15, yPos)

    yPos += 8
    doc.setTextColor(...grayLight)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${new Date(dateRange.start).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })} – ${new Date(dateRange.end).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      15,
      yPos
    )

    // Stats boxes
    yPos += 15
    const boxWidth = (pageWidth - 40) / 4
    const statBoxes = [
      { label: 'Total Hours', value: formatMinutesToHours(stats.totalMinutos) },
      { label: 'Days Worked', value: String(stats.diasTrabalhados) },
      { label: 'Sessions', value: String(stats.totalSessoes) },
      { label: 'Locations', value: String(stats.locaisUsados.length) },
    ]

    statBoxes.forEach((stat, i) => {
      const x = 15 + (i * (boxWidth + 5))

      // Box background
      doc.setFillColor(249, 250, 251)
      doc.roundedRect(x, yPos, boxWidth, 28, 3, 3, 'F')

      // Value
      doc.setTextColor(...grayDark)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(stat.value, x + boxWidth / 2, yPos + 12, { align: 'center' })

      // Label
      doc.setTextColor(...grayLight)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(stat.label, x + boxWidth / 2, yPos + 22, { align: 'center' })
    })

    // Locations list
    if (stats.locaisUsados.length > 0) {
      yPos += 40
      doc.setTextColor(...grayLight)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('WORK LOCATIONS', 15, yPos)

      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...grayDark)
      doc.text(stats.locaisUsados.join('  •  '), 15, yPos)
    }

    // Records table
    yPos += 15

    const tableData = entries.map((entry) => {
      const entryAt = new Date(entry.entry_at)
      const exitAt = entry.exit_at ? new Date(entry.exit_at) : null
      const duration = exitAt
        ? Math.round((exitAt.getTime() - entryAt.getTime()) / 60000)
        : null

      return [
        entry.location_name || 'Unknown',
        entryAt.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }),
        entryAt.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }),
        exitAt
          ? exitAt.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false })
          : 'In progress',
        duration ? formatMinutesToHours(duration) : '-',
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['Location', 'Date', 'Clock In', 'Clock Out', 'Duration']],
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [249, 250, 251],
        textColor: grayLight,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        textColor: grayDark,
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30, fontStyle: 'bold' },
      },
      didDrawCell: (data: any) => {
        // Highlight edited records
        if (data.section === 'body' && entries[data.row.index]?.manually_edited) {
          doc.setFillColor(254, 243, 199) // amber-100
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')

          // Redraw text
          doc.setTextColor(...grayDark)
          doc.text(
            String(data.cell.text),
            data.cell.x + 4,
            data.cell.y + data.cell.height / 2 + 2
          )
        }
      },
    })

    // Footer with disclaimer
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50

    if (stats.registrosEditados > 0) {
      doc.setTextColor(...grayLight)
      doc.setFontSize(8)
      doc.text(
        `* This report contains ${stats.registrosEditados} manually edited record(s). Original geofence data is preserved.`,
        15,
        finalY + 10
      )
    }

    // Page footer
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setTextColor(...grayLight)
    doc.setFontSize(8)
    doc.text('OnSite Club • onsiteclub.ca', pageWidth / 2, pageHeight - 10, { align: 'center' })

    // Generate buffer
    const buffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="timekeeper-report.pdf"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}
