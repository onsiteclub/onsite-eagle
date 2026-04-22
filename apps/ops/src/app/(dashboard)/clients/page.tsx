import { requireOperator, initialsOf } from '@/lib/auth'
import { formatCurrencyShort } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClientsPage() {
  const operator = await requireOperator()
  const supabase = await createClient()

  // Fetch all active clients with their latest ledger balance.
  const { data: clients } = await supabase
    .from('ops_clients')
    .select('id, display_name, email, fee_percent_override, status')
    .eq('operator_id', operator.id)
    .eq('status', 'active')
    .order('display_name')

  const clientIds = (clients ?? []).map((c) => c.id)

  // Pull the latest balance_after for each client (one query, client-side sort).
  const balanceMap: Record<string, number> = {}
  if (clientIds.length > 0) {
    const { data: entries } = await supabase
      .from('ops_ledger_entries')
      .select('client_id, balance_after, created_at')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })

    for (const e of entries ?? []) {
      if (balanceMap[e.client_id] === undefined) {
        balanceMap[e.client_id] = Number(e.balance_after)
      }
    }
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="font-mono text-[12px] text-ink-3 mb-2">
          Nenhum cliente ainda.
        </div>
        <div className="font-mono text-[11px] text-ink-3">
          Quando um remetente novo mandar invoice, o card vai aparecer na Caixa
          de Entrada.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="section-label">Clientes ativos · {clients.length}</div>
      {clients.map((c) => {
        const balance = balanceMap[c.id] ?? 0
        const owes = balance < 0
        const balanceLabel = owes
          ? `${formatCurrencyShort(Math.abs(balance))} devidos`
          : balance > 0
            ? `${formatCurrencyShort(balance)} em crédito`
            : 'quitado'
        const toneClass = owes
          ? 'bg-red-soft text-red border-red'
          : 'bg-green-soft text-green border-green'
        const feePercent = c.fee_percent_override ?? operator.default_fee_percent

        return (
          <Link
            key={c.id}
            href={`/statement?clientId=${c.id}`}
            className="grid gap-4 py-4 border-b border-line items-center cursor-pointer hover:bg-paper-2 transition-colors"
            style={{ gridTemplateColumns: '80px 1fr auto auto' }}
          >
            <div className="font-mono text-[13px] font-semibold text-ink">
              {initialsOf(c.display_name)}
            </div>
            <div>
              <div className="font-bold text-[14px]">{c.display_name}</div>
              <div className="font-mono text-[11px] text-ink-3 mt-0.5">{c.email}</div>
            </div>
            <div className="font-mono text-[13px] font-semibold text-ink">
              {Number(feePercent)}%
            </div>
            <div
              className={[
                'font-mono text-[10px] px-2 py-[3px] uppercase tracking-[0.05em] font-semibold border',
                toneClass,
              ].join(' ')}
            >
              {balanceLabel}
            </div>
          </Link>
        )
      })}
    </>
  )
}
