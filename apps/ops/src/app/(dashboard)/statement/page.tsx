import { StatementView } from '@/components/statement/statement-view'
import { requireOperator } from '@/lib/auth'
import { formatDateShortPt } from '@/lib/format-date'
import { createClient } from '@/lib/supabase/server'
import { getInvoicePdfUrls } from '@/lib/supabase/storage'
import Link from 'next/link'
import type { LedgerRow as LedgerRowType } from '@/types'

type LedgerEntryFromDb = {
  id: string
  entry_type: string
  amount: number
  balance_after: number
  entry_date: string
  description: string | null
  invoice_id: string | null
  settled_by_invoice_id: string | null
  invoice: {
    id: string
    status: string
    amount_gross: number
    invoice_number: string | null
    divergence_flagged: boolean
    pdf_url: string | null
  } | null
}

function labelFor(entry: LedgerEntryFromDb): { label: string; labelKind: 'invoice' | 'text' } {
  if (entry.entry_type === 'invoice_received' && entry.invoice) {
    return {
      label: entry.invoice.invoice_number ?? entry.invoice.id.slice(0, 8),
      labelKind: 'invoice',
    }
  }
  const textMap: Record<string, string> = {
    gc_payment_received: 'GC pagou',
    advance_paid: 'Adiantamento',
    cash_paid_full: 'Pagamento cash',
    operator_fee: 'Fee operador',
    adjustment: 'Ajuste',
  }
  return {
    label: entry.description ?? textMap[entry.entry_type] ?? entry.entry_type,
    labelKind: 'text',
  }
}

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  const operator = await requireOperator()
  const supabase = await createClient()
  const params = await searchParams
  const clientId = params.clientId

  if (!clientId) {
    return (
      <div className="py-10 text-center">
        <div className="font-mono text-[12px] text-ink-3 mb-4">
          Selecione um cliente pra ver o extrato.
        </div>
        <Link href="/clients" className="btn btn-primary inline-block">
          Ver clientes
        </Link>
      </div>
    )
  }

  const { data: client } = await supabase
    .from('ops_clients')
    .select('id, display_name, email, fee_percent_override')
    .eq('id', clientId)
    .eq('operator_id', operator.id)
    .maybeSingle()

  if (!client) {
    return (
      <div className="py-10 text-center font-mono text-[12px] text-ink-3">
        Cliente não encontrado.
      </div>
    )
  }

  const feePercent = client.fee_percent_override ?? operator.default_fee_percent

  const [{ data: entries }, { data: advances }] = await Promise.all([
    supabase
      .from('ops_ledger_entries')
      .select(`
        id, entry_type, amount, balance_after, entry_date, description,
        invoice_id, settled_by_invoice_id,
        invoice:ops_invoices(id, status, amount_gross, invoice_number, divergence_flagged, pdf_url)
      `)
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('ops_ledger_entries')
      .select('amount')
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)
      .eq('entry_type', 'advance_paid')
      .is('settled_by_invoice_id', null),
  ])

  const normalized: LedgerEntryFromDb[] = (entries ?? []).map((e) => ({
    ...e,
    amount: Number(e.amount),
    balance_after: Number(e.balance_after),
    invoice: Array.isArray(e.invoice) ? (e.invoice[0] ?? null) : e.invoice,
  })) as LedgerEntryFromDb[]

  const balance = normalized.length > 0 ? normalized[0].balance_after : 0

  // Batch sign all distinct PDF paths from the invoice join
  const pdfPaths = Array.from(
    new Set(
      normalized
        .map((e) => e.invoice?.pdf_url)
        .filter((p): p is string => !!p),
    ),
  )
  const pdfUrls = await getInvoicePdfUrls(pdfPaths)

  const openRows: LedgerRowType[] = []
  const closedRows: LedgerRowType[] = []
  const rowInvoiceId: Record<string, string | null> = {}
  const rowPdfUrls: Record<string, string | null> = {}

  for (const e of normalized) {
    const { label, labelKind } = labelFor(e)
    const isLocked = e.invoice?.status === 'locked'
    const isReceivedNeedsRecon =
      e.entry_type === 'invoice_received' &&
      e.invoice &&
      ['pending', 'approved'].includes(e.invoice.status)

    const row: LedgerRowType = {
      id: e.id,
      dateLabel: formatDateShortPt(e.entry_date),
      label,
      labelKind,
      amount: e.amount,
      balanceAfter: e.balance_after,
      paid: isLocked,
      alerted: !!e.invoice?.divergence_flagged,
      expected: isReceivedNeedsRecon ? Number(e.invoice!.amount_gross) : undefined,
    }

    rowInvoiceId[e.id] = e.invoice_id
    rowPdfUrls[e.id] = e.invoice?.pdf_url ? (pdfUrls[e.invoice.pdf_url] ?? null) : null

    if (isLocked) closedRows.push(row)
    else openRows.push(row)
  }

  const pendingAdvancesTotal = (advances ?? []).reduce(
    (sum, a) => sum + Number(a.amount),
    0,
  )

  return (
    <StatementView
      client={{
        id: client.id,
        display_name: client.display_name,
        email: client.email,
        fee_percent: Number(feePercent),
      }}
      balance={balance}
      openRows={openRows}
      closedRows={closedRows}
      rowInvoiceId={rowInvoiceId}
      rowPdfUrls={rowPdfUrls}
      pendingAdvancesTotal={pendingAdvancesTotal}
    />
  )
}
