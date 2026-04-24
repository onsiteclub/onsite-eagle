import { InboxFeed, type InboxMessage } from '@/components/inbox/inbox-feed'
import type { InboxState } from '@/components/inbox/state-label'
import { requireOperator } from '@/lib/auth'
import { formatDateShortPt, formatTime24 } from '@/lib/format-date'
import { createClient } from '@/lib/supabase/server'
import { getInvoicePdfUrls } from '@/lib/supabase/storage'

export default async function InboxPage() {
  const operator = await requireOperator()
  const supabase = await createClient()

  // Unified feed: every received email. Invoice details joined when present.
  const { data } = await supabase
    .from('ops_inbox_messages')
    .select(`
      id, received_at, from_email, from_name, subject, state,
      parent_message_id, invoice_id,
      invoice:ops_invoices(
        id, client_id, invoice_number, amount_gross, pdf_url,
        gc:ops_gcs(name)
      )
    `)
    .eq('operator_id', operator.id)
    .order('received_at', { ascending: false })
    .limit(200)

  const rows = data ?? []

  // Batch-sign every PDF in one round trip
  type Row = (typeof rows)[number]
  const invoiceOf = (r: Row) =>
    Array.isArray(r.invoice) ? r.invoice[0] ?? null : r.invoice

  const pdfPaths = rows
    .map((r) => invoiceOf(r)?.pdf_url)
    .filter((p): p is string => !!p)
  const signed = await getInvoicePdfUrls(Array.from(new Set(pdfPaths)))

  const messages: InboxMessage[] = rows.map((r) => {
    const inv = invoiceOf(r)
    const gc = inv
      ? Array.isArray(inv.gc)
        ? inv.gc[0] ?? null
        : inv.gc
      : null

    const amount =
      inv && inv.amount_gross !== null && r.state !== 'reply' && r.state !== 'message'
        ? Number(inv.amount_gross)
        : null

    const searchBlob = [
      r.from_name,
      r.from_email,
      r.subject,
      inv?.invoice_number,
      gc?.name,
      formatDateShortPt(r.received_at),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return {
      id: r.id,
      receivedAt: r.received_at,
      dateLabel: formatDateShortPt(r.received_at),
      timeLabel: formatTime24(r.received_at),
      fromName: r.from_name ?? r.from_email,
      fromEmail: r.from_email,
      subject: r.subject ?? '',
      company: gc?.name ?? null,
      invoiceNumber: inv?.invoice_number ?? null,
      amount,
      state: r.state as InboxState,
      parentMessageId: r.parent_message_id,
      invoiceId: r.invoice_id,
      clientId: inv?.client_id ?? null,
      pdfUrl: inv?.pdf_url ? signed[inv.pdf_url] ?? null : null,
      searchBlob,
    }
  })

  return (
    <>
      <h1 className="page-title">Inbox</h1>
      <div className="page-subtitle">
        {messages.length} {messages.length === 1 ? 'message' : 'messages'}
      </div>
      <InboxFeed messages={messages} />
    </>
  )
}
