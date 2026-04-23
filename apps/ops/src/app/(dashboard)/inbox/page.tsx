import { InboxView, type NewSenderData } from '@/components/inbox/inbox-view'
import { requireOperator } from '@/lib/auth'
import { daysAgoISO, formatDateShortPt, formatRelativeAgo, formatTime24 } from '@/lib/format-date'
import { createClient } from '@/lib/supabase/server'
import { getInvoicePdfUrls } from '@/lib/supabase/storage'
import type { InboxRow as InboxRowType, InboxStatus } from '@/types'

function statusFromInvoice(status: string): { status: InboxStatus; label: string } {
  switch (status) {
    case 'new_sender':
      return { status: 'pending', label: 'Novo' }
    case 'pending':
      return { status: 'pending', label: 'Pendente' }
    case 'rejected':
      return { status: 'unknown', label: 'Rejeitado' }
    case 'approved':
    case 'paid_by_gc':
    case 'paid_to_client':
    case 'locked':
      return { status: 'accepted', label: 'Aceito' }
    default:
      return { status: 'unknown', label: status }
  }
}

export default async function InboxPage() {
  const operator = await requireOperator()
  const supabase = await createClient()

  // Fetch em paralelo: new_senders + recentes + companies
  const [newSendersResp, recentResp, companiesResp] = await Promise.all([
    supabase
      .from('ops_invoices')
      .select('id, from_name, from_email, invoice_number, site_address, amount_gross, received_at, pdf_url, gc:ops_gcs(name)')
      .eq('operator_id', operator.id)
      .eq('status', 'new_sender')
      .order('received_at', { ascending: false }),
    supabase
      .from('ops_invoices')
      .select('id, client_id, from_name, from_email, subject, amount_gross, received_at, status, pdf_url')
      .eq('operator_id', operator.id)
      .gte('received_at', daysAgoISO(7))
      .order('received_at', { ascending: false })
      .limit(50),
    supabase
      .from('ops_companies')
      .select('id, legal_name, trade_name')
      .eq('operator_id', operator.id)
      .eq('is_active', true)
      .order('legal_name'),
  ])

  // Sign all PDFs in one batch (new_senders + recent invoices)
  const pdfPaths = [
    ...(newSendersResp.data ?? []).map((i) => i.pdf_url),
    ...(recentResp.data ?? []).map((i) => i.pdf_url),
  ].filter((p): p is string => !!p)
  const pdfUrls = await getInvoicePdfUrls(Array.from(new Set(pdfPaths)))

  const newSenders: NewSenderData[] = (newSendersResp.data ?? []).map((i) => ({
    invoiceId: i.id,
    fromName: i.from_name,
    fromEmail: i.from_email,
    invoiceNumber: i.invoice_number,
    gcName: Array.isArray(i.gc) ? (i.gc[0]?.name ?? null) : ((i.gc as { name: string } | null)?.name ?? null),
    siteAddress: i.site_address,
    amountGross: Number(i.amount_gross),
    receivedAgo: formatRelativeAgo(i.received_at),
    pdfUrl: i.pdf_url ? (pdfUrls[i.pdf_url] ?? null) : null,
  }))

  const rows: InboxRowType[] = (recentResp.data ?? []).map((inv) => {
    const { status, label } = statusFromInvoice(inv.status)
    return {
      id: inv.id,
      dateLabel: formatDateShortPt(inv.received_at),
      timeLabel: formatTime24(inv.received_at),
      fromName: inv.from_name ?? inv.from_email,
      fromEmail: inv.from_email,
      subject: inv.subject ?? '',
      amount: Number(inv.amount_gross),
      status,
      statusLabel: label,
    }
  })

  const rowInvoiceIds: Record<string, string | null> = Object.fromEntries(
    (recentResp.data ?? []).map((inv) => [inv.id, inv.client_id]),
  )

  const rowPdfUrls: Record<string, string | null> = Object.fromEntries(
    (recentResp.data ?? []).map((inv) => [
      inv.id,
      inv.pdf_url ? (pdfUrls[inv.pdf_url] ?? null) : null,
    ]),
  )

  return (
    <InboxView
      newSenders={newSenders}
      rows={rows}
      rowInvoiceIds={rowInvoiceIds}
      rowPdfUrls={rowPdfUrls}
      companies={companiesResp.data ?? []}
      defaultFeePercent={operator.default_fee_percent}
    />
  )
}
