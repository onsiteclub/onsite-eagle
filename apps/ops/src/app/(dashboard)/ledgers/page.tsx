import { LedgersListView, type LedgerCardData } from '@/components/ledgers/ledger-search'
import { initialsOf, requireOperator } from '@/lib/auth'
import { formatDateShortPt } from '@/lib/format-date'
import { createClient } from '@/lib/supabase/server'

export default async function LedgersPage() {
  const operator = await requireOperator()
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('ops_clients')
    .select('id, display_name, email, status')
    .eq('operator_id', operator.id)
    .eq('status', 'active')
    .order('display_name')

  const clientIds = (clients ?? []).map((c) => c.id)
  if (clientIds.length === 0) {
    return <LedgersListView openClients={[]} settledClients={[]} />
  }

  // Latest ledger entry per client → balance_after + activity markers
  const { data: entries } = await supabase
    .from('ops_ledger_entries')
    .select('client_id, balance_after, created_at, entry_type')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })

  const balanceMap: Record<string, number> = {}
  const lastActivityMap: Record<string, string> = {}
  const lastPaymentMap: Record<string, string> = {}
  for (const e of entries ?? []) {
    if (balanceMap[e.client_id] === undefined) {
      balanceMap[e.client_id] = Number(e.balance_after)
      lastActivityMap[e.client_id] = e.created_at
    }
    if (
      !lastPaymentMap[e.client_id] &&
      ['cash_paid_full', 'gc_payment_received'].includes(e.entry_type)
    ) {
      lastPaymentMap[e.client_id] = e.created_at
    }
  }

  // Open invoice counts (not locked / rejected)
  const { data: openInvoices } = await supabase
    .from('ops_invoices')
    .select('client_id')
    .in('client_id', clientIds)
    .in('status', ['pending', 'approved', 'paid_by_gc'])

  const openCountMap: Record<string, number> = {}
  for (const i of openInvoices ?? []) {
    if (i.client_id) {
      openCountMap[i.client_id] = (openCountMap[i.client_id] ?? 0) + 1
    }
  }

  // Primary company (first linked) per client
  const { data: companyLinks } = await supabase
    .from('ops_client_company_access')
    .select('client_id, company:ops_companies(legal_name, trade_name)')
    .in('client_id', clientIds)

  const companyMap: Record<string, string> = {}
  for (const link of companyLinks ?? []) {
    if (companyMap[link.client_id]) continue
    const company = Array.isArray(link.company) ? link.company[0] : link.company
    if (company) companyMap[link.client_id] = company.trade_name || company.legal_name
  }

  const openClients: LedgerCardData[] = []
  const settledClients: LedgerCardData[] = []

  for (const c of clients ?? []) {
    const balance = balanceMap[c.id] ?? 0
    const lastActivity = lastActivityMap[c.id]
    const lastPayment = lastPaymentMap[c.id]
    const openCount = openCountMap[c.id] ?? 0
    const card: LedgerCardData = {
      id: c.id,
      displayName: c.display_name,
      email: c.email,
      initials: initialsOf(c.display_name),
      companyName: companyMap[c.id] ?? null,
      lastActivity: lastActivity ? formatDateShortPt(lastActivity) : null,
      balance,
      openInvoiceCount: openCount,
      lastPaymentDate: lastPayment ? formatDateShortPt(lastPayment) : null,
    }
    if (balance < 0 || openCount > 0) openClients.push(card)
    else settledClients.push(card)
  }

  return <LedgersListView openClients={openClients} settledClients={settledClients} />
}
