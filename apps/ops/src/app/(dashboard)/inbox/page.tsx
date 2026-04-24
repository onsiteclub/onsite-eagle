import {
  InboxView,
  type InvoiceSource,
  type NewSenderData,
} from '@/components/inbox/inbox-view'
import { InboxTabs, type InboxView as InboxViewKind } from '@/components/inbox/inbox-tabs'
import {
  DuplicatesView,
  type DuplicateRow,
} from '@/components/inbox/duplicates-view'
import type { LinkableClient } from '@/components/inbox/link-client-modal'
import { RejectedView, type RejectedRow } from '@/components/inbox/rejected-view'
import {
  UnprocessedView,
  type UnprocessedRow,
} from '@/components/inbox/unprocessed-view'
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

function parseView(raw: string | undefined): InboxViewKind {
  if (raw === 'rejected' || raw === 'unprocessed' || raw === 'duplicates') return raw
  return 'active'
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const operator = await requireOperator()
  const supabase = await createClient()
  const params = await searchParams
  const view = parseView(params.view)

  // Counts for all 4 tabs (always) + payload for the active tab.
  const [
    activeCountResp,
    rejectedCountResp,
    unprocessedCountResp,
    duplicatesCountResp,
  ] = await Promise.all([
    supabase
      .from('ops_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('operator_id', operator.id)
      .in('status', ['new_sender', 'pending']),
    supabase
      .from('ops_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('operator_id', operator.id)
      .eq('status', 'rejected'),
    supabase
      .from('ops_inbox_unprocessed')
      .select('id', { count: 'exact', head: true })
      .eq('operator_id', operator.id)
      .is('resolved_at', null),
    // Versions only exist when someone resent a PDF we already have.
    // RLS on ops_invoice_versions filters by operator via the FK join.
    supabase
      .from('ops_invoice_versions')
      .select('id', { count: 'exact', head: true })
      .eq('rejected', false)
      .gt('version_number', 1),
  ])

  const tabs = (
    <InboxTabs
      current={view}
      activeCount={activeCountResp.count ?? 0}
      rejectedCount={rejectedCountResp.count ?? 0}
      unprocessedCount={unprocessedCountResp.count ?? 0}
      duplicatesCount={duplicatesCountResp.count ?? 0}
    />
  )

  if (view === 'rejected') {
    const { data } = await supabase
      .from('ops_invoices')
      .select('id, from_name, from_email, subject, amount_gross, received_at')
      .eq('operator_id', operator.id)
      .eq('status', 'rejected')
      .order('received_at', { ascending: false })
      .limit(100)

    const rows: RejectedRow[] = (data ?? []).map((inv) => ({
      id: inv.id,
      fromName: inv.from_name ?? inv.from_email,
      fromEmail: inv.from_email,
      subject: inv.subject ?? '',
      amount: inv.amount_gross ? Number(inv.amount_gross) : null,
      dateLabel: formatDateShortPt(inv.received_at),
      timeLabel: formatTime24(inv.received_at),
    }))

    return (
      <>
        {tabs}
        <RejectedView rows={rows} />
      </>
    )
  }

  if (view === 'unprocessed') {
    const { data } = await supabase
      .from('ops_inbox_unprocessed')
      .select('id, from_name, from_email, subject, reason, received_at')
      .eq('operator_id', operator.id)
      .is('resolved_at', null)
      .order('received_at', { ascending: false })
      .limit(100)

    const rows: UnprocessedRow[] = (data ?? []).map((u) => ({
      id: u.id,
      fromName: u.from_name ?? u.from_email,
      fromEmail: u.from_email,
      subject: u.subject ?? '',
      reason: u.reason,
      dateLabel: formatDateShortPt(u.received_at),
      timeLabel: formatTime24(u.received_at),
    }))

    return (
      <>
        {tabs}
        <UnprocessedView rows={rows} />
      </>
    )
  }

  if (view === 'duplicates') {
    // version_number > 1 = re-arrival. is_current stays false for these.
    const { data: versions } = await supabase
      .from('ops_invoice_versions')
      .select(`
        id, version_number, received_at, pdf_url,
        invoice:ops_invoices!inner(
          id, from_name, from_email, subject, received_at, status, operator_id
        )
      `)
      .eq('rejected', false)
      .gt('version_number', 1)
      .order('received_at', { ascending: false })
      .limit(100)

    // Collect pdf paths (each version stores its own pdf_url, same hash as original)
    const paths = (versions ?? [])
      .map((v) => v.pdf_url)
      .filter((p): p is string => !!p)
    const signedUrls = await getInvoicePdfUrls(Array.from(new Set(paths)))

    const rows: DuplicateRow[] = (versions ?? []).flatMap((v) => {
      const inv = Array.isArray(v.invoice) ? v.invoice[0] : v.invoice
      if (!inv) return []
      if (inv.operator_id !== operator.id) return []
      return [
        {
          versionId: v.id,
          invoiceId: inv.id,
          versionNumber: v.version_number,
          fromName: inv.from_name ?? inv.from_email,
          fromEmail: inv.from_email,
          originalSubject: inv.subject ?? '(sem assunto)',
          originalStatus: inv.status,
          originalReceivedLabel: formatDateShortPt(inv.received_at),
          reArrivedLabel: `${formatDateShortPt(v.received_at)} · ${formatTime24(v.received_at)}`,
          pdfUrl: v.pdf_url ? (signedUrls[v.pdf_url] ?? null) : null,
        },
      ]
    })

    return (
      <>
        {tabs}
        <DuplicatesView rows={rows} />
      </>
    )
  }

  // Default view: active invoices
  const [newSendersResp, recentResp, companiesResp, clientsResp] = await Promise.all([
    supabase
      .from('ops_invoices')
      .select('id, from_name, from_email, invoice_number, site_address, amount_gross, received_at, pdf_url, source, gc:ops_gcs(name)')
      .eq('operator_id', operator.id)
      .eq('status', 'new_sender')
      .order('received_at', { ascending: false }),
    supabase
      .from('ops_invoices')
      .select('id, client_id, from_name, from_email, subject, amount_gross, received_at, status, pdf_url, source')
      .eq('operator_id', operator.id)
      .neq('status', 'rejected')
      .gte('received_at', daysAgoISO(7))
      .order('received_at', { ascending: false })
      .limit(50),
    supabase
      .from('ops_companies')
      .select('id, legal_name, trade_name')
      .eq('operator_id', operator.id)
      .eq('is_active', true)
      .order('legal_name'),
    supabase
      .from('ops_clients')
      .select('id, display_name, email')
      .eq('operator_id', operator.id)
      .eq('status', 'active')
      .order('display_name'),
  ])

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
    source: (i.source ?? 'manual') as InvoiceSource,
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

  const rowSenders: Record<string, string> = Object.fromEntries(
    (recentResp.data ?? []).map((inv) => [
      inv.id,
      inv.from_name ?? inv.from_email,
    ]),
  )

  const rowSources: Record<string, InvoiceSource> = Object.fromEntries(
    (recentResp.data ?? []).map((inv) => [
      inv.id,
      (inv.source ?? 'manual') as InvoiceSource,
    ]),
  )

  const existingClients: LinkableClient[] = (clientsResp.data ?? []).map((c) => ({
    id: c.id,
    displayName: c.display_name,
    email: c.email,
  }))

  return (
    <>
      {tabs}
      <InboxView
        newSenders={newSenders}
        rows={rows}
        rowInvoiceIds={rowInvoiceIds}
        rowPdfUrls={rowPdfUrls}
        rowSenders={rowSenders}
        rowSources={rowSources}
        companies={companiesResp.data ?? []}
        existingClients={existingClients}
        defaultFeePercent={operator.default_fee_percent}
      />
    </>
  )
}
