/**
 * PDF Report Generator for Self-Service Checklist
 *
 * Uses @onsite/export/pdf helpers for branded layout.
 */

import {
  createPDF,
  getPageLayout,
  addBrandHeader,
  addBrandFooter,
  addStatBoxes,
  addSectionTitle,
  createPageBreakChecker,
} from '@onsite/export/pdf'
import { BRAND_COLORS } from '@onsite/export/branding'

export interface ReportItem {
  code: string
  label: string
  isBlocking: boolean
  result: 'pass' | 'fail' | 'na' | 'pending'
  notes: string
  photos: string[] // base64 data URLs (up to 5)
}

export interface ReportInfo {
  name: string
  company: string
  jobsite: string
  lotNumber: string
  transition: string
  transitionLabel: string
  startedAt: string
  completedAt: string
  passed: boolean
  items: ReportItem[]
}

export async function generateChecklistPDF(report: ReportInfo): Promise<Blob> {
  const doc = await createPDF()
  const { margin, contentWidth } = getPageLayout(doc)
  const checkBreak = createPageBreakChecker(doc)

  const passCount = report.items.filter((i) => i.result === 'pass').length
  const failCount = report.items.filter((i) => i.result === 'fail').length
  const naCount = report.items.filter((i) => i.result === 'na').length
  const totalPhotos = report.items.reduce((sum, i) => sum + i.photos.length, 0)

  // Header
  let y = addBrandHeader(doc, {
    title: report.transitionLabel,
    subtitle: `${report.jobsite} — ${report.lotNumber}`,
    backgroundColor: report.passed ? BRAND_COLORS.accent : BRAND_COLORS.error,
  })

  // Result badge
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...(report.passed ? BRAND_COLORS.accent : BRAND_COLORS.error))
  doc.text(report.passed ? 'PASSED' : 'FAILED', margin, y)
  y += 8

  // Inspector info
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRAND_COLORS.textSecondary)
  doc.text(`Inspector: ${report.name}${report.company ? ` (${report.company})` : ''}`, margin, y)
  y += 5
  doc.text(`Date: ${new Date(report.completedAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y)
  y += 5
  doc.text(`Photos attached: ${totalPhotos}`, margin, y)
  y += 10

  // Stats
  y = addStatBoxes(doc, [
    { value: String(passCount), label: 'Pass' },
    { value: String(failCount), label: 'Fail' },
    { value: String(naCount), label: 'N/A' },
    { value: String(report.items.length), label: 'Total' },
  ], y)

  // Items section
  y = addSectionTitle(doc, 'Checklist Items', y, { accentColor: BRAND_COLORS.accent })

  for (let idx = 0; idx < report.items.length; idx++) {
    const item = report.items[idx]
    const itemNumber = idx + 1

    // Estimate height needed: label + photos row + notes
    const photoRowHeight = item.photos.length > 0 ? 28 : 0
    const notesHeight = item.result === 'fail' && item.notes ? 8 : 0
    const neededHeight = 14 + photoRowHeight + notesHeight
    y = checkBreak(y, neededHeight)

    // Item row
    const resultColor =
      item.result === 'pass' ? [5, 150, 105] as [number, number, number] :
      item.result === 'fail' ? [220, 38, 38] as [number, number, number] :
      [156, 163, 175] as [number, number, number]

    const resultText =
      item.result === 'pass' ? 'PASS' :
      item.result === 'fail' ? 'FAIL' : 'N/A'

    // Item number
    doc.setTextColor(...BRAND_COLORS.textSecondary)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(`${itemNumber}.`, margin, y + 1)

    // Result badge (shifted right to make room for number)
    const badgeX = margin + 8
    doc.setFillColor(...resultColor)
    doc.roundedRect(badgeX, y - 3, 14, 6, 1, 1, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.text(resultText, badgeX + 7, y + 1, { align: 'center' })

    // Label
    doc.setTextColor(...BRAND_COLORS.text)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    const labelX = margin + 25
    const maxLabelWidth = contentWidth - 25 - (item.isBlocking ? 22 : 0)
    const lines = doc.splitTextToSize(item.label, maxLabelWidth)
    doc.text(lines, labelX, y + 1)

    // Blocking badge
    if (item.isBlocking) {
      const blockX = margin + contentWidth - 20
      doc.setFillColor(254, 242, 242)
      doc.roundedRect(blockX, y - 3, 20, 6, 1, 1, 'F')
      doc.setTextColor(220, 38, 38)
      doc.setFontSize(5)
      doc.text('BLOCKING', blockX + 10, y + 1, { align: 'center' })
    }

    y += lines.length * 4 + 4

    // Photo count indicator
    if (item.photos.length > 0) {
      doc.setTextColor(...BRAND_COLORS.textSecondary)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text(`${item.photos.length} photo${item.photos.length > 1 ? 's' : ''}`, labelX, y)
      y += 4
    }

    // Photos in a row (inline thumbnails)
    if (item.photos.length > 0) {
      y = checkBreak(y, 25)
      const photoSize = 22 // mm per photo
      const photoGap = 2

      for (let i = 0; i < item.photos.length; i++) {
        const photoX = labelX + i * (photoSize + photoGap)
        // Check if photo fits on current line
        if (photoX + photoSize > margin + contentWidth) break
        try {
          doc.addImage(item.photos[i], 'JPEG', photoX, y, photoSize, photoSize)
        } catch {
          // Draw placeholder if image fails
          doc.setDrawColor(200, 200, 200)
          doc.rect(photoX, y, photoSize, photoSize)
          doc.setFontSize(5)
          doc.setTextColor(150, 150, 150)
          doc.text('err', photoX + photoSize / 2, y + photoSize / 2, { align: 'center' })
        }
      }
      y += photoSize + 3
    }

    // Notes for failed items
    if (item.result === 'fail' && item.notes) {
      doc.setTextColor(...BRAND_COLORS.textSecondary)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'italic')
      const noteLines = doc.splitTextToSize(`Notes: ${item.notes}`, contentWidth - 25)
      doc.text(noteLines, labelX, y)
      y += noteLines.length * 3.5 + 2
    }

    y += 2
  }

  // Footer
  addBrandFooter(doc)

  return doc.output('blob')
}
