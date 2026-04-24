import { createServiceClient } from '@/lib/supabase/service'
import {
  extractXmpMetadata,
  normalizeXmpData,
  parseSubjectLine,
  type ExtractedInvoice,
} from '@/lib/email/extract-xmp'
import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'

// =============================================================================
// /api/inbox — Postmark Inbound webhook
// =============================================================================
// Autenticação: token via query-string (`?token=...`) OU header
// `Authorization: Bearer ...`. Configurar URL no dashboard Postmark como:
//   https://ops.onsiteclub.ca/api/inbox?token=<POSTMARK_INBOUND_WEBHOOK_SECRET>
//
// Postmark NÃO assina payloads via HMAC. Em vez disso, eles sugerem:
//   - Basic auth na URL
//   - IP allowlisting (50.31.156.6, 18.217.206.57, 3.134.147.250)
//   - Token secreto na URL (o que usamos aqui)
//
// Usa service_role — bypassa RLS para poder inserir como qualquer operador.
// Nunca expor esta route para rotas autenticadas do app.
// =============================================================================

type PostmarkAttachment = {
  Name: string
  ContentType: string
  Content: string // base64
  ContentLength?: number
  ContentID?: string | null
}

type PostmarkPayload = {
  From: string
  FromName?: string
  To: string
  Subject?: string
  Date: string
  MessageID: string
  Attachments?: PostmarkAttachment[]
  TextBody?: string
  HtmlBody?: string
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.POSTMARK_INBOUND_WEBHOOK_SECRET
  if (!secret) return false

  // Accepted in either query-string OR Bearer header.
  const { searchParams } = new URL(request.url)
  const provided =
    searchParams.get('token') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    null

  if (!provided) return false

  // Timing-safe compare.
  const a = Buffer.from(secret)
  const b = Buffer.from(provided)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// 3-tier extraction cascade: XMP metadata → subject parse → manual_required.
// See ops-directive-amendment-xmp.md for the contract.
function extractInvoiceData(
  pdfBuffer: Buffer,
  subject: string | undefined | null,
): ExtractedInvoice {
  const xmp = extractXmpMetadata(pdfBuffer)
  if (xmp) return normalizeXmpData(xmp)

  const subjectData = parseSubjectLine(subject)
  if (subjectData.invoice_number || subjectData.amount_gross > 0) {
    return {
      invoice_number: subjectData.invoice_number,
      amount_gross: subjectData.amount_gross,
      amount_hst: 0,
      gc_name: null,
      site_address: null,
      issuer_email: null,
      issuer_name: null,
      company_name: null,
      company_hst_number: null,
      issued_at: null,
      source: 'subject',
      source_version: null,
    }
  }

  return {
    invoice_number: null,
    amount_gross: 0,
    amount_hst: 0,
    gc_name: null,
    site_address: null,
    issuer_email: null,
    issuer_name: null,
    company_name: null,
    company_hst_number: null,
    issued_at: null,
    source: 'manual_required',
    source_version: null,
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  let email: PostmarkPayload
  try {
    email = (await request.json()) as PostmarkPayload
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  if (!email?.From || !email?.To || !email?.Date || !email?.MessageID) {
    return new NextResponse('Missing required fields', { status: 400 })
  }

  const supabase = createServiceClient()

  // 1. Identify operator from recipient (username@inbox-domain)
  const [username] = email.To.toLowerCase().split('@')
  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id, default_fee_percent')
    .eq('inbox_username', username)
    .maybeSingle()

  if (!operator) {
    // Recipient doesn't match any operator — discard silently (HTTP 200 so
    // Postmark doesn't retry).
    return NextResponse.json({ ok: true, status: 'no_operator' })
  }

  const fromEmail = email.From.toLowerCase()

  // 2. Blocklist check
  const { data: blocked } = await supabase
    .from('ops_inbox_blocklist')
    .select('id')
    .eq('operator_id', operator.id)
    .eq('blocked_email', fromEmail)
    .maybeSingle()

  if (blocked) {
    return NextResponse.json({ ok: true, status: 'blocked' })
  }

  // 3. PDF attachment (primary business requirement — sem PDF, sem invoice)
  const pdfAttachment = email.Attachments?.find(
    (a) => a.ContentType === 'application/pdf',
  )

  if (!pdfAttachment) {
    // Persist so the operator can review it in /inbox/unprocessed.
    // Previously this email was silently 200'd and lost.
    await supabase.from('ops_inbox_unprocessed').insert({
      operator_id: operator.id,
      from_email: fromEmail,
      from_name: email.FromName ?? null,
      subject: email.Subject ?? null,
      received_at: email.Date,
      raw_email_id: email.MessageID,
      reason: 'no_pdf',
    })
    return NextResponse.json({ ok: true, status: 'no_pdf' })
  }

  // 4. Upload PDF to storage, keyed by hash for integrity + dedup
  const pdfBuffer = Buffer.from(pdfAttachment.Content, 'base64')
  const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex')
  const pdfPath = `${operator.id}/${pdfHash}.pdf`

  const { error: uploadError } = await supabase.storage
    .from('ops-invoices')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  // Duplicate upload = same PDF already stored → not an error.
  const isDuplicate =
    uploadError?.message.includes('already exists') ||
    uploadError?.message.includes('The resource already exists')

  if (uploadError && !isDuplicate) {
    console.error('[inbox] storage upload failed', uploadError)
    return new NextResponse('Storage error', { status: 500 })
  }

  // 5. Dedup at DB level: if this operator already got an invoice with this
  // pdf_hash, treat as duplicate. (Sprint 2 will track versions.)
  const { data: existingInvoice } = await supabase
    .from('ops_invoices')
    .select('id')
    .eq('operator_id', operator.id)
    .eq('pdf_hash', pdfHash)
    .maybeSingle()

  if (existingInvoice) {
    return NextResponse.json({
      ok: true,
      status: 'duplicate',
      invoice_id: existingInvoice.id,
    })
  }

  // 6. Look up existing client by email
  const { data: client } = await supabase
    .from('ops_clients')
    .select('id')
    .eq('operator_id', operator.id)
    .eq('email', fromEmail)
    .maybeSingle()

  // 7. Extract invoice data via 3-tier cascade (XMP → subject → manual)
  const extracted = extractInvoiceData(pdfBuffer, email.Subject)

  // 8. Insert invoice.
  // `from_email` stays as the Postmark envelope address (source of truth for
  // identity); XMP issuer_email is used only when Postmark's is missing.
  const { data: invoice, error: insertError } = await supabase
    .from('ops_invoices')
    .insert({
      operator_id: operator.id,
      client_id: client?.id ?? null,
      pdf_url: pdfPath,
      pdf_hash: pdfHash,
      invoice_number: extracted.invoice_number,
      amount_gross: extracted.amount_gross,
      amount_hst: extracted.amount_hst || null,
      site_address: extracted.site_address,
      from_email: fromEmail,
      from_name: email.FromName ?? extracted.issuer_name,
      subject: email.Subject ?? null,
      received_at: email.Date,
      raw_email_id: email.MessageID,
      source: extracted.source,
      source_version: extracted.source_version,
      status: client ? 'pending' : 'new_sender',
    })
    .select('id')
    .single()

  if (insertError || !invoice) {
    console.error('[inbox] invoice insert failed', insertError)
    return new NextResponse('DB error', { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    status: client ? 'pending' : 'new_sender',
    invoice_id: invoice.id,
    source: extracted.source,
    amount_parsed: extracted.amount_gross,
  })
}

// GET para health-check do webhook (Postmark pode pingar pra validar URL)
export async function GET() {
  return NextResponse.json({ ok: true, route: 'ops inbox webhook' })
}
