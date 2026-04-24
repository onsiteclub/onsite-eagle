// =============================================================================
// extract-xmp.ts — reads OnSite XMP metadata embedded in invoice PDFs
// =============================================================================
// Contract: see `ops-directive-amendment-xmp.md`. Timekeeper embeds an XMP
// packet in every invoice PDF using the namespace below. The webhook reads
// it to populate invoice fields without parsing the email subject.
//
// Strategy: regex over the PDF bytes read as latin1. The XMP packet is
// guaranteed to be uncompressed (Timekeeper sets `useObjectStreams: false`),
// so it lives as plain text inside the binary. Reading as latin1 preserves
// every byte; UTF-8 values are re-decoded per field so accents survive.
// =============================================================================

const XMP_NAMESPACE = 'http://schemas.onsiteclub.ca/invoice/1.0/'

export interface OnsiteXmpData {
  namespace_matched: true
  invoice_number: string
  amount: string
  hst: string
  currency: string
  gc_name: string
  site_address: string
  issuer_email: string
  issuer_name: string
  company_name: string
  company_hst_number: string
  hours_logged: string
  issued_at: string
  timekeeper_version: string
}

const UTF8_FIELDS = new Set([
  'issuer_name',
  'company_name',
  'site_address',
  'gc_name',
])

export function extractXmpMetadata(pdfBuffer: Buffer): OnsiteXmpData | null {
  const pdfString = pdfBuffer.toString('latin1')

  const xmpMatch = pdfString.match(/<x:xmpmeta[^>]*>([\s\S]*?)<\/x:xmpmeta>/)
  if (!xmpMatch) return null

  const xmpContent = xmpMatch[1]
  if (!xmpContent.includes(XMP_NAMESPACE)) return null

  const extractField = (fieldName: string): string => {
    const pattern = new RegExp(
      `<onsite:${fieldName}[^>]*>([\\s\\S]*?)<\\/onsite:${fieldName}>`,
      'i'
    )
    const match = xmpContent.match(pattern)
    if (!match) return ''

    const decoded = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim()

    if (UTF8_FIELDS.has(fieldName)) {
      return Buffer.from(decoded, 'latin1').toString('utf8')
    }
    return decoded
  }

  return {
    namespace_matched: true,
    invoice_number: extractField('invoice_number'),
    amount: extractField('amount'),
    hst: extractField('hst'),
    currency: extractField('currency'),
    gc_name: extractField('gc_name'),
    site_address: extractField('site_address'),
    issuer_email: extractField('issuer_email'),
    issuer_name: extractField('issuer_name'),
    company_name: extractField('company_name'),
    company_hst_number: extractField('company_hst_number'),
    hours_logged: extractField('hours_logged'),
    issued_at: extractField('issued_at'),
    timekeeper_version: extractField('timekeeper_version'),
  }
}

// =============================================================================
// Normalized extraction result — what the webhook actually writes to the DB.
// Cascade: extractXmpMetadata() → parseSubjectLine() → manual_required.
// =============================================================================

export interface ExtractedInvoice {
  invoice_number: string | null
  amount_gross: number
  amount_hst: number
  gc_name: string | null
  site_address: string | null
  issuer_email: string | null
  issuer_name: string | null
  company_name: string | null
  company_hst_number: string | null
  issued_at: string | null
  source: 'xmp' | 'subject' | 'manual_required'
  source_version: string | null
}

export function normalizeXmpData(xmp: OnsiteXmpData): ExtractedInvoice {
  const hasCompanyName = xmp.company_name.length > 0
  return {
    invoice_number: xmp.invoice_number || null,
    amount_gross: parseFloat(xmp.amount) || 0,
    amount_hst: parseFloat(xmp.hst) || 0,
    gc_name: xmp.gc_name || null,
    site_address: xmp.site_address || null,
    issuer_email: xmp.issuer_email || null,
    issuer_name: xmp.issuer_name || null,
    company_name: xmp.company_name || null,
    company_hst_number: xmp.company_hst_number || null,
    issued_at: xmp.issued_at || null,
    // A Timekeeper PDF missing company_name means the user never completed
    // their business profile — Paulo must fill it before approval.
    source: hasCompanyName ? 'xmp' : 'manual_required',
    source_version: xmp.timekeeper_version || null,
  }
}

// =============================================================================
// Subject-line fallback parser.
// Matches "$1,234.56" or "$ 1234,56" anywhere in the subject.
// =============================================================================

export function parseSubjectLine(subject: string | undefined | null): {
  invoice_number: string | null
  amount_gross: number
} {
  if (!subject) return { invoice_number: null, amount_gross: 0 }

  // Invoice number like "INV-1234", "JK-A-0047", "#0047"
  const invoiceMatch =
    subject.match(/\b([A-Z]{2,}-[A-Z0-9-]+)\b/) ?? subject.match(/#\s?(\d+)/)
  const invoice_number = invoiceMatch ? invoiceMatch[1] : null

  // Amount like "$1,234.56" or "$ 1234,56"
  const amountMatch = subject.match(/\$\s?([\d.,]+)/)
  let amount_gross = 0
  if (amountMatch) {
    const raw = amountMatch[1]
    const lastComma = raw.lastIndexOf(',')
    const lastDot = raw.lastIndexOf('.')
    // Whichever separator appears last is the decimal point.
    const decimalIdx = Math.max(lastComma, lastDot)
    const normalized =
      decimalIdx === -1
        ? raw.replace(/[.,]/g, '')
        : raw.slice(0, decimalIdx).replace(/[.,]/g, '') +
          '.' +
          raw.slice(decimalIdx + 1)
    amount_gross = parseFloat(normalized) || 0
  }

  return { invoice_number, amount_gross }
}
