/**
 * OnSite PDF Export Helpers
 *
 * Building blocks for branded PDF reports using jsPDF.
 * Each app composes these helpers to build its own report layout.
 *
 * Requires: jspdf (peer dependency)
 */

import { BRAND_COLORS, formatReportDate } from './branding';
import type { RGB, PDFConfig, BrandHeaderOptions, BrandFooterOptions, StatBox } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDoc = any;

/**
 * Create a new jsPDF document with OnSite defaults.
 *
 * Dynamically imports jspdf to keep bundle size small.
 */
export async function createPDF(config?: PDFConfig): Promise<PDFDoc> {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;

  return new jsPDF({
    orientation: config?.orientation ?? 'portrait',
    unit: 'mm',
    format: config?.format ?? 'a4',
  });
}

/**
 * Get page dimensions and margin info for a document.
 */
export function getPageLayout(doc: PDFDoc, margin: number = 20) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;

  return { pageWidth, pageHeight, margin, contentWidth };
}

/**
 * Create a page break checker function.
 *
 * Returns a function that adds a new page if needed and returns the current Y position.
 */
export function createPageBreakChecker(
  doc: PDFDoc,
  margin: number = 20
): (currentY: number, neededHeight: number) => number {
  const pageHeight = doc.internal.pageSize.getHeight();

  return (currentY: number, neededHeight: number): number => {
    if (currentY + neededHeight > pageHeight - margin) {
      doc.addPage();
      return margin;
    }
    return currentY;
  };
}

/**
 * Add a branded header to the current page.
 *
 * Light theme: brand primary background with white text.
 * Returns the Y position after the header.
 */
export function addBrandHeader(
  doc: PDFDoc,
  options: BrandHeaderOptions
): number {
  const { pageWidth } = getPageLayout(doc);
  const bgColor = options.backgroundColor ?? BRAND_COLORS.primary;
  const titleColor = options.titleColor ?? BRAND_COLORS.white;
  const date = options.date ?? new Date();

  // Background bar
  doc.setFillColor(...bgColor);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title
  doc.setTextColor(...titleColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title, 15, 18);

  // Subtitle
  if (options.subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(options.subtitle, 15, 27);
  }

  // Date (right-aligned)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${formatReportDate(date)}`,
    pageWidth - 15,
    27,
    { align: 'right' }
  );

  return 45;
}

/**
 * Add a dark-themed header (for analytics/intelligence reports).
 *
 * Dark background with accent-colored title.
 * Returns the Y position after the header.
 */
export function addDarkHeader(
  doc: PDFDoc,
  options: BrandHeaderOptions & { accentColor?: RGB }
): number {
  const { pageWidth } = getPageLayout(doc);
  const bgColor = options.backgroundColor ?? [24, 24, 27] as RGB;   // zinc-900
  const accentColor = options.accentColor ?? [249, 115, 22] as RGB; // orange-500
  const date = options.date ?? new Date();

  // Background bar
  doc.setFillColor(...bgColor);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title in accent color
  doc.setTextColor(...accentColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title, 20, 18);

  // Subtitle in white
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (options.subtitle) {
    doc.text(options.subtitle, 20, 26);
  }

  // Date (right, muted)
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.setFontSize(8);
  doc.text(
    formatReportDate(date),
    pageWidth - 20,
    18,
    { align: 'right' }
  );

  return 45;
}

/**
 * Add branded footer to all pages.
 *
 * Call this AFTER all content has been added to the document.
 */
export function addBrandFooter(
  doc: PDFDoc,
  options?: BrandFooterOptions
): void {
  const text = options?.text ?? 'OnSite Club \u2022 onsiteclub.ca';
  const showPageNumbers = options?.showPageNumbers ?? true;
  const pageCount = (doc.internal as Record<string, unknown> & { getNumberOfPages(): number }).getNumberOfPages();
  const { pageWidth, pageHeight } = getPageLayout(doc);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(...BRAND_COLORS.textSecondary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(text, pageWidth / 2, pageHeight - 10, { align: 'center' });

    if (showPageNumbers) {
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 15,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  }
}

/**
 * Add a dark-themed footer to all pages.
 */
export function addDarkFooter(
  doc: PDFDoc,
  options?: BrandFooterOptions
): void {
  const text = options?.text ?? 'Generated by OnSite Club Analytics';
  const showPageNumbers = options?.showPageNumbers ?? true;
  const pageCount = (doc.internal as Record<string, unknown> & { getNumberOfPages(): number }).getNumberOfPages();
  const { pageWidth, pageHeight } = getPageLayout(doc);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.setFontSize(8);
    doc.text(text, 20, pageHeight - 6);

    if (showPageNumbers) {
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 20,
        pageHeight - 6,
        { align: 'right' }
      );
    }
  }
}

/**
 * Render a row of stat boxes.
 *
 * Returns the Y position after the boxes.
 */
export function addStatBoxes(
  doc: PDFDoc,
  stats: StatBox[],
  startY: number,
  options?: {
    margin?: number;
    boxHeight?: number;
    backgroundColor?: RGB;
    valueColor?: RGB;
    labelColor?: RGB;
  }
): number {
  const margin = options?.margin ?? 15;
  const boxHeight = options?.boxHeight ?? 28;
  const bgColor = options?.backgroundColor ?? BRAND_COLORS.surfaceMuted;
  const valueColor = options?.valueColor ?? BRAND_COLORS.text;
  const labelColor = options?.labelColor ?? BRAND_COLORS.textSecondary;

  const { contentWidth } = getPageLayout(doc, margin);
  const gap = 5;
  const boxWidth = (contentWidth - gap * (stats.length - 1)) / stats.length;

  stats.forEach((stat, i) => {
    const x = margin + i * (boxWidth + gap);

    // Background
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, startY, boxWidth, boxHeight, 3, 3, 'F');

    // Value
    doc.setTextColor(...valueColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, x + boxWidth / 2, startY + 12, { align: 'center' });

    // Label
    doc.setTextColor(...labelColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, x + boxWidth / 2, startY + 22, { align: 'center' });
  });

  return startY + boxHeight + 10;
}

/**
 * Add a section title with accent bar.
 *
 * Returns the Y position after the title.
 */
export function addSectionTitle(
  doc: PDFDoc,
  title: string,
  startY: number,
  options?: {
    margin?: number;
    accentColor?: RGB;
    textColor?: RGB;
  }
): number {
  const margin = options?.margin ?? 15;
  const accentColor = options?.accentColor ?? BRAND_COLORS.primary;
  const textColor = options?.textColor ?? BRAND_COLORS.text;

  // Accent bar
  doc.setFillColor(...accentColor);
  doc.rect(margin, startY, 3, 12, 'F');

  // Title text
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 8, startY + 8);

  doc.setFont('helvetica', 'normal');
  return startY + 18;
}
