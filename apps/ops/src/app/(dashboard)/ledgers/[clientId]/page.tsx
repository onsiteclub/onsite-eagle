import {
  LedgerDetailView,
  type LedgerDetailData,
  type MovementRow,
} from '@/components/ledgers/ledger-detail-view'
import { requireOperator } from '@/lib/auth'
import { formatDateShortPt } from '@/lib/format-date'
import { createClient } from '@/lib/supabase/server'
import { getInvoicePdfUrls } from '@/lib/supabase/storage'
import Link from 'next/link'

type EntryFromDb = {
  id: string
  entry_type: string
  amount: number
  balance_after: number
  entry_date: string
  created_at: string
  description: string | null
  invoice_id: string | null
  invoice: {
    id: string
    status: string
    amount_gross: number
    invoice_number: string | null
    amount_received: number | null
    pdf_url: string | null
  } | null
}

const TYPE_TO_ICON: Record<string, MovementRow['icon']> = {
  invoice_received: 'invoice',
  gc_payment_received: 'payment',
  cash_paid_full: 'payment',
  operator_fee: 'payment',
  advance_paid: 'advance',
  adjustment: 'correction',
}

const TYPE_LABEL: Record<string, string> = {
  invoice_received: 'Invoice received',
  gc_payment_received: 'GC payment received',
  cash_paid_full: 'Cash payment',
  operator_fee: 'Operator fee',
  advance_paid: 'Advance',
  adjustment: 'Correction',
}

export default async function LedgerDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const operator = await requireOperator()
  const supabase = await createClient()
  const { clientId } = await params

  const { data: client } = await supabase
    .from('ops_clients')
    .select('id, display_name, email, fee_percent_override')
    .eq('id', clientId)
    .eq('operator_id', operator.id)
    .maybeSingle()

  if (!client) {
    return (
      <div className="pdf-preview" style={{ marginTop: 32 }}>
        Person not found.{' '}
        <Link href="/ledgers" className="back-link" style={{ display: 'inline' }}>
          Back to ledgers
        </Link>
      </div>
    )
  }

  const feePercent = Number(client.fee_percent_override ?? operator.default_fee_percent)

  // Primary company
  const { data: companyLink } = await supabase
    .from('ops_client_company_access')
    .select('company:ops_companies(legal_name, trade_name)')
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle()

  const companyRow = Array.isArray(companyLink?.company) ? companyLink.company[0] : companyLink?.company
  const companyName = companyRow ? (companyRow.trade_name || companyRow.legal_name) : null

  // Entries + invoice join
  const [{ data: entries }, { data: advances }, { count: openInvoiceCount }] = await Promise.all([
    supabase
      .from('ops_ledger_entries')
      .select(`
        id, entry_type, amount, balance_after, entry_date, created_at, description,
        invoice_id,
        invoice:ops_invoices(id, status, amount_gross, invoice_number, amount_received, pdf_url)
      `)
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('ops_ledger_entries')
      .select('amount')
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)
      .eq('entry_type', 'advance_paid')
      .is('settled_by_invoice_id', null),
    supabase
      .from('ops_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)
      .in('status', ['pending', 'approved', 'paid_by_gc']),
  ])

  const normalized: EntryFromDb[] = (entries ?? []).map((e) => ({
    ...e,
    amount: Number(e.amount),
    balance_after: Number(e.balance_after),
    invoice: Array.isArray(e.invoice) ? (e.invoice[0] ?? null) : e.invoice,
  })) as EntryFromDb[]

  // Sign PDFs in batch
  const pdfPaths = Array.from(
    new Set(
      normalized
        .map((e) => e.invoice?.pdf_url)
        .filter((p): p is string => !!p),
    ),
  )
  const pdfUrls = await getInvoicePdfUrls(pdfPaths)

  // Most recent first for display
  const sortedDesc = [...normalized].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )

  // Find last payment
  const lastPaymentEntry = sortedDesc.find((e) =>
    ['cash_paid_full', 'gc_payment_received'].includes(e.entry_type),
  )
  const lastPaymentDate = lastPaymentEntry
    ? formatDateShortPt(lastPaymentEntry.created_at)
    : null

  // Current balance = latest balance_after
  const balance = sortedDesc.length > 0 ? sortedDesc[0].balance_after : 0

  // Pending advances total (for cash modal breakdown)
  const pendingAdvancesTotal = (advances ?? []).reduce(
    (sum, a) => sum + Number(a.amount),
    0,
  )

  // Transform to MovementRow
  const movements: MovementRow[] = sortedDesc.map((e) => {
    const icon = TYPE_TO_ICON[e.entry_type] ?? 'correction'
    const typeLabel = TYPE_LABEL[e.entry_type] ?? e.entry_type
    const needsRecon =
      e.entry_type === 'invoice_received' &&
      e.invoice &&
      ['pending', 'approved'].includes(e.invoice.status)

    let description = e.description ?? ''
    if (e.entry_type === 'invoice_received' && e.invoice) {
      description = companyName ?? 'Open invoice'
    } else if (e.entry_type === 'cash_paid_full' && e.invoice) {
      description = `Settled ${e.invoice.invoice_number ?? e.invoice.id.slice(0, 8)}`
    }

    // Note: show fee breakdown on cash payment entry
    let note: string | undefined
    if (e.entry_type === 'cash_paid_full' && e.invoice?.amount_received) {
      const received = Number(e.invoice.amount_received)
      const fee = Math.round(received * (feePercent / 100) * 100) / 100
      const cash = received - fee
      note = `$${cash.toFixed(2)} cash · $${fee.toFixed(2)} your fee (${feePercent}%)`
    } else if (e.entry_type === 'advance_paid') {
      note = 'Will deduct from next payment'
    }

    const invoiceRef = e.invoice
      ? {
          number: e.invoice.invoice_number ?? e.invoice.id.slice(0, 8),
          pdfUrl: e.invoice.pdf_url ? (pdfUrls[e.invoice.pdf_url] ?? null) : null,
        }
      : null

    return {
      id: e.id,
      entryDate: e.entry_date,
      createdAt: e.created_at,
      icon,
      type: needsRecon ? `${typeLabel} — open` : typeLabel,
      description,
      invoiceRef,
      note,
      amount: e.amount,
      runningBalance: e.balance_after,
      openInvoiceId: needsRecon ? e.invoice!.id : null,
      expectedAmount: needsRecon ? Number(e.invoice!.amount_gross) : null,
    }
  })

  const data: LedgerDetailData = {
    person: {
      id: client.id,
      displayName: client.display_name,
      email: client.email,
      feePercent,
      companyName,
      openInvoiceCount: openInvoiceCount ?? 0,
      lastPaymentDate,
    },
    balance,
    movements,
    pendingAdvancesTotal,
  }

  return <LedgerDetailView data={data} />
}
