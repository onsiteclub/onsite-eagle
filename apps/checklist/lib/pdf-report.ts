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

  // Header — dark background always, amber is the accent
  let y = addBrandHeader(doc, {
    title: report.transitionLabel,
    subtitle: `${report.jobsite} — ${report.lotNumber}`,
    backgroundColor: BRAND_COLORS.dark,
  })

  // Logo — white version on dark header (top-right)
  try {
    const logoRes = await fetch('/onsite-club-white.png')
    const logoBlob = await logoRes.blob()
    const logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(logoBlob)
    })
    const pageWidth = doc.internal.pageSize.getWidth()
    doc.addImage(logoBase64, 'PNG', pageWidth - 55, 5, 40, 12)
  } catch {
    // Logo not available — skip silently
  }

  // Result badge
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...(report.passed ? BRAND_COLORS.success : BRAND_COLORS.error))
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
  y = addSectionTitle(doc, 'Checklist Items', y, { accentColor: BRAND_COLORS.primary })

  const cardPadding = 4 // mm padding inside card
  const cardGap = 3 // mm between cards

  for (let idx = 0; idx < report.items.length; idx++) {
    const item = report.items[idx]
    const itemNumber = idx + 1

    // Pre-calculate card content height
    const innerX = margin + cardPadding
    const innerWidth = contentWidth - cardPadding * 2
    const labelMaxW = innerWidth - 22 - (item.isBlocking ? 22 : 0)
    const labelLines = doc.splitTextToSize(item.label, labelMaxW)
    const headerHeight = Math.max(labelLines.length * 4, 6) + 4
    const photoRowHeight = item.photos.length > 0 ? 30 : 0
    const notesHeight = item.result === 'fail' && item.notes ? 10 : 0
    const totalCardHeight = cardPadding * 2 + headerHeight + photoRowHeight + notesHeight

    y = checkBreak(y, totalCardHeight)

    // Card colors based on result — amber/stone design system
    const resultColor =
      item.result === 'pass' ? [22, 163, 74] as [number, number, number] :   // #16A34A
      item.result === 'fail' ? [220, 38, 38] as [number, number, number] :   // #DC2626
      [176, 175, 169] as [number, number, number]                             // #B0AFA9

    const cardBorderColor =
      item.result === 'pass' ? [209, 250, 229] as [number, number, number] : // #D1FAE5
      item.result === 'fail' ? [252, 210, 210] as [number, number, number] : // soft red
      [209, 208, 206] as [number, number, number]                             // #D1D0CE

    const cardBgColor =
      item.result === 'pass' ? [248, 255, 250] as [number, number, number] :
      item.result === 'fail' ? [255, 250, 250] as [number, number, number] :
      [245, 245, 244] as [number, number, number]                             // #F5F5F4

    const resultText =
      item.result === 'pass' ? 'PASS' :
      item.result === 'fail' ? 'FAIL' : 'N/A'

    // Draw card background
    doc.setFillColor(...cardBgColor)
    doc.setDrawColor(...cardBorderColor)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, y, contentWidth, totalCardHeight, 2, 2, 'FD')

    // Left accent bar (2mm wide colored strip)
    doc.setFillColor(...resultColor)
    doc.roundedRect(margin, y, 2, totalCardHeight, 2, 0, 'F')
    // Fill the right side of the accent bar that the roundedRect curves
    doc.rect(margin + 1, y, 1, totalCardHeight, 'F')

    let cy = y + cardPadding // cursor inside card

    // Item number + result badge row
    doc.setTextColor(...BRAND_COLORS.textSecondary)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(`${itemNumber}.`, innerX + 1, cy + 3.5)

    // Result badge
    const badgeX = innerX + 9
    doc.setFillColor(...resultColor)
    doc.roundedRect(badgeX, cy, 14, 6, 1, 1, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.text(resultText, badgeX + 7, cy + 4, { align: 'center' })

    // Label
    const labelX = innerX + 26
    doc.setTextColor(...BRAND_COLORS.text)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(labelLines, labelX, cy + 3.5)

    // Blocking badge
    if (item.isBlocking) {
      const blockX = margin + contentWidth - cardPadding - 20
      doc.setFillColor(255, 240, 240)
      doc.roundedRect(blockX, cy, 20, 6, 1, 1, 'F')
      doc.setTextColor(220, 38, 38)
      doc.setFontSize(5)
      doc.setFont('helvetica', 'bold')
      doc.text('BLOCKING', blockX + 10, cy + 4, { align: 'center' })
    }

    cy += headerHeight

    // Photos in a row (inline thumbnails)
    if (item.photos.length > 0) {
      const photoSize = 22
      const photoGap = 2
      // Photo count
      doc.setTextColor(...BRAND_COLORS.textSecondary)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text(`${item.photos.length} photo${item.photos.length > 1 ? 's' : ''}`, labelX, cy + 2)
      cy += 4

      for (let i = 0; i < item.photos.length; i++) {
        const photoX = labelX + i * (photoSize + photoGap)
        if (photoX + photoSize > margin + contentWidth - cardPadding) break
        try {
          doc.addImage(item.photos[i], 'JPEG', photoX, cy, photoSize, photoSize)
        } catch {
          doc.setDrawColor(200, 200, 200)
          doc.rect(photoX, cy, photoSize, photoSize)
          doc.setFontSize(5)
          doc.setTextColor(150, 150, 150)
          doc.text('err', photoX + photoSize / 2, cy + photoSize / 2, { align: 'center' })
        }
      }
      cy += photoSize + 4
    }

    // Notes for failed items
    if (item.result === 'fail' && item.notes) {
      doc.setTextColor(...BRAND_COLORS.textSecondary)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'italic')
      const noteLines = doc.splitTextToSize(`Notes: ${item.notes}`, innerWidth - 26)
      doc.text(noteLines, labelX, cy + 2)
    }

    y += totalCardHeight + cardGap
  }

  // Footer
  addBrandFooter(doc)

  return doc.output('blob')
}
