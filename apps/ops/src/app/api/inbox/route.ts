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
// Auth: token via `?token=...` or `Authorization: Bearer ...`. Postmark doesn't
// HMAC-sign, so token-in-URL is the recommended approach per their docs.
//
// Uses service_role — bypasses RLS to insert on behalf of any operator. Never
// expose this route to authenticated app routes.
// =============================================================================

type PostmarkAttachment = {
  Name: string
  ContentType: string
  Content: string
  ContentLength?: number
  ContentID?: string | null
}

type PostmarkHeader = { Name: string; Value: string }

type PostmarkPayload = {
  From: string
  FromName?: string
  To: string
  Subject?: string
  Date: string
  MessageID: string
  Attachments?: PostmarkAttachment[]
  Headers?: PostmarkHeader[]
  TextBody?: string
  HtmlBody?: string
}

type InboxState =
  | 'new_sender'
  | 'conflict'
  | 'timekeeper'
  | 'external_pdf'
  | 'message'
  | 'reply'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.POSTMARK_INBOUND_WEBHOOK_SECRET
  if (!secret) return false
  const { searchParams } = new URL(request.url)
  const provided =
    searchParams.get('token') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    null
  if (!provided) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(provided)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function getHeader(email: PostmarkPayload, name: string): string | null {
  const hit = email.Headers?.find((h) => h.Name.toLowerCase() === name.toLowerCase())
  return hit?.Value ?? null
}

// Extracts the first MessageID from an email header value. In-Reply-To is
// usually a single `<id>`, References may hold multiple space-separated ids.
// We match the parent as the LAST id in References (most recent ancestor).
function extractReplyParentId(email: PostmarkPayload): string | null {
  const inReplyTo = getHeader(email, 'In-Reply-To')
  if (inReplyTo) {
    const m = inReplyTo.match(/<([^>]+)>/)
    if (m) return m[1]
  }
  const refs = getHeader(email, 'References')
  if (refs) {
    const all = Array.from(refs.matchAll(/<([^>]+)>/g)).map((x) => x[1])
    if (all.length > 0) return all[all.length - 1]
  }
  return null
}

// 3-tier extraction cascade: XMP → subject → manual_required
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

  // 1. Identify operator from recipient
  const [username] = email.To.toLowerCase().split(/[<>"\s@]/).filter(Boolean)
  const recipientLocal = email.To.toLowerCase().match(/([^\s<>"]+)@/)?.[1] ?? username
  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id')
    .eq('inbox_username', recipientLocal)
    .maybeSingle()

  if (!operator) {
    return NextResponse.json({ ok: true, status: 'no_operator' })
  }

  const fromEmail = email.From.toLowerCase()

  // 2. Blocklist → drop silently (the only silent drop)
  const { data: blocked } = await supabase
    .from('ops_inbox_blocklist')
    .select('id')
    .eq('operator_id', operator.id)
    .eq('blocked_email', fromEmail)
    .maybeSingle()

  if (blocked) {
    return NextResponse.json({ ok: true, status: 'blocked' })
  }

  // 3. Detect reply to an existing message in our inbox
  const inReplyTo = extractReplyParentId(email)
  let parentMessageId: string | null = null
  if (inReplyTo) {
    const { data: parent } = await supabase
      .from('ops_inbox_messages')
      .select('id')
      .eq('operator_id', operator.id)
      .eq('message_id', inReplyTo)
      .maybeSingle()
    parentMessageId = parent?.id ?? null
  }

  // 4. Lookup client by from_email (identifies "known sender")
  const { data: client } = await supabase
    .from('ops_clients')
    .select('id')
    .eq('operator_id', operator.id)
    .eq('email', fromEmail)
    .maybeSingle()

  // 5. Find PDF attachment
  const pdfAttachment = email.Attachments?.find(
    (a) => a.ContentType === 'application/pdf',
  )

  // ===========================================================================
  // NO PDF branch
  // ===========================================================================
  if (!pdfAttachment) {
    const state: InboxState = parentMessageId
      ? 'reply'
      : client
        ? 'message'
        : 'new_sender'

    const { data: msg, error: msgErr } = await supabase
      .from('ops_inbox_messages')
      .insert({
        operator_id: operator.id,
        message_id: email.MessageID,
        in_reply_to_message_id: inReplyTo,
        parent_message_id: parentMessageId,
        from_email: fromEmail,
        from_name: email.FromName ?? null,
        subject: email.Subject ?? null,
        received_at: email.Date,
        invoice_id: null,
        state,
      })
      .select('id')
      .single()

    if (msgErr) {
      // duplicate delivery (same MessageID) → idempotent 200
      if (msgErr.message.includes('duplicate')) {
        return NextResponse.json({ ok: true, status: 'duplicate_delivery' })
      }
      console.error('[inbox] message insert failed (no-pdf)', msgErr)
      return new NextResponse('DB error', { status: 500 })
    }

    return NextResponse.json({ ok: true, status: state, message_id: msg.id })
  }

  // ===========================================================================
  // PDF branch
  // ===========================================================================
  const pdfBuffer = Buffer.from(pdfAttachment.Content, 'base64')
  const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex')
  const pdfPath = `${operator.id}/${pdfHash}.pdf`

  // Upload (dedup on storage is fine — same hash, same bytes)
  const { error: uploadError } = await supabase.storage
    .from('ops-invoices')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })
  const isDuplicateStorage =
    uploadError?.message.includes('already exists') ||
    uploadError?.message.includes('The resource already exists')
  if (uploadError && !isDuplicateStorage) {
    console.error('[inbox] storage upload failed', uploadError)
    return new NextResponse('Storage error', { status: 500 })
  }

  // Check DB dedup by pdf_hash
  const { data: existingInvoice } = await supabase
    .from('ops_invoices')
    .select('id, amount_gross')
    .eq('operator_id', operator.id)
    .eq('pdf_hash', pdfHash)
    .maybeSingle()

  // ---- CONFLICT: same PDF arrived again ----
  if (existingInvoice) {
    // Record version (history)
    const { data: lastVersion } = await supabase
      .from('ops_invoice_versions')
      .select('version_number')
      .eq('invoice_id', existingInvoice.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextVersion = (lastVersion?.version_number ?? 1) + 1
    await supabase.from('ops_invoice_versions').insert({
      invoice_id: existingInvoice.id,
      version_number: nextVersion,
      amount_gross: existingInvoice.amount_gross,
      pdf_url: pdfPath,
      pdf_hash: pdfHash,
      received_at: email.Date,
      is_current: false,
      rejected: false,
    })

    // Record in inbox feed as CONFLICT row, linked to the original invoice
    const { data: msg, error: msgErr } = await supabase
      .from('ops_inbox_messages')
      .insert({
        operator_id: operator.id,
        message_id: email.MessageID,
        in_reply_to_message_id: inReplyTo,
        parent_message_id: parentMessageId,
        from_email: fromEmail,
        from_name: email.FromName ?? null,
        subject: email.Subject ?? null,
        received_at: email.Date,
        invoice_id: existingInvoice.id,
        state: 'conflict',
      })
      .select('id')
      .single()
    if (msgErr && !msgErr.message.includes('duplicate')) {
      console.error('[inbox] message insert failed (conflict)', msgErr)
    }

    return NextResponse.json({
      ok: true,
      status: 'conflict',
      invoice_id: existingInvoice.id,
      version_number: nextVersion,
      message_id: msg?.id ?? null,
    })
  }

  // ---- Normal PDF invoice ----
  const extracted = extractInvoiceData(pdfBuffer, email.Subject)

  // state logic for non-conflict PDFs:
  //   reply header → 'reply'
  //   unknown sender → 'new_sender'
  //   known sender + XMP → 'timekeeper'
  //   known sender, no XMP → 'external_pdf'
  const state: InboxState = parentMessageId
    ? 'reply'
    : !client
      ? 'new_sender'
      : extracted.source === 'xmp'
        ? 'timekeeper'
        : 'external_pdf'

  // Invoice gets status 'approved' when sender is known and not a reply,
  // because we auto-post to the ledger below. 'new_sender' stays as status
  // 'new_sender' until Paulo decides. Replies with PDF behave like the base
  // case (known vs unknown).
  const invoiceStatus = !client ? 'new_sender' : 'approved'

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
      status: invoiceStatus,
      approved_at: invoiceStatus === 'approved' ? new Date().toISOString() : null,
    })
    .select('id, amount_gross')
    .single()

  if (insertError || !invoice) {
    console.error('[inbox] invoice insert failed', insertError)
    return new NextResponse('DB error', { status: 500 })
  }

  // Inbox feed row
  const { data: msg, error: msgErr } = await supabase
    .from('ops_inbox_messages')
    .insert({
      operator_id: operator.id,
      message_id: email.MessageID,
      in_reply_to_message_id: inReplyTo,
      parent_message_id: parentMessageId,
      from_email: fromEmail,
      from_name: email.FromName ?? null,
      subject: email.Subject ?? null,
      received_at: email.Date,
      invoice_id: invoice.id,
      state,
    })
    .select('id')
    .single()
  if (msgErr && !msgErr.message.includes('duplicate')) {
    console.error('[inbox] message insert failed', msgErr)
  }

  // ---- Auto-ledger entry when sender is known (non-reply) ----
  // Replies to existing invoices don't create a new ledger entry — the
  // original invoice already has one.
  if (client && state !== 'reply') {
    const { data: lastEntry } = await supabase
      .from('ops_ledger_entries')
      .select('balance_after')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const prev = lastEntry ? Number(lastEntry.balance_after) : 0
    const gross = Number(invoice.amount_gross)
    const balanceAfter = Math.round((prev - gross) * 100) / 100

    await supabase.from('ops_ledger_entries').insert({
      operator_id: operator.id,
      client_id: client.id,
      entry_type: 'invoice_received',
      amount: -gross,
      balance_after: balanceAfter,
      invoice_id: invoice.id,
      description: `Invoice ${extracted.invoice_number ?? invoice.id.slice(0, 8)}`,
      entry_date: new Date().toISOString().split('T')[0],
      created_by: null,
    })
  }

  return NextResponse.json({
    ok: true,
    status: state,
    invoice_id: invoice.id,
    message_id: msg?.id ?? null,
    source: extracted.source,
  })
}

// GET handshake for Postmark "Check" button
export async function GET() {
  return NextResponse.json({ ok: true, route: 'ops inbox webhook' })
}
