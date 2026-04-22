'use server'

import { requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type StatementActionState = { error: string | null }

/**
 * Marca invoice como paid_by_gc + salva amount_received + flag de divergência.
 * Chamado pelo ReconcileModal.
 */
export async function reconcileInvoiceAction(
  invoiceId: string,
  amountReceived: number,
): Promise<StatementActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const { data: invoice, error } = await supabase
    .from('ops_invoices')
    .select('amount_gross, status')
    .eq('id', invoiceId)
    .eq('operator_id', operator.id)
    .single()

  if (error || !invoice) return { error: 'Invoice não encontrada.' }
  if (invoice.status === 'locked') return { error: 'Invoice já está travada.' }

  const diff = amountReceived - invoice.amount_gross
  const isDivergent = Math.abs(diff) > 0.5

  const { error: updateErr } = await supabase
    .from('ops_invoices')
    .update({
      amount_received: amountReceived,
      status: 'paid_by_gc',
      paid_by_gc_at: new Date().toISOString(),
      divergence_flagged: isDivergent,
      divergence_amount: isDivergent ? diff : null,
    })
    .eq('id', invoiceId)
    .eq('operator_id', operator.id)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/statement')
  return { error: null }
}

/**
 * Registra o pagamento cash ao cliente + liquidação de adiantamentos + lock do invoice.
 * 3 ledger entries criadas: gc_payment_received, operator_fee, cash_paid_full.
 * Chamado pelo CashPayoutModal após "Paguei".
 */
export async function markPaidToClientAction(
  invoiceId: string,
): Promise<StatementActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  // 1. Fetch invoice + cliente + fee_percent_override
  const { data: invoice, error: invErr } = await supabase
    .from('ops_invoices')
    .select(`
      id, status, amount_received, client_id, operator_id, invoice_number,
      client:ops_clients(id, fee_percent_override)
    `)
    .eq('id', invoiceId)
    .eq('operator_id', operator.id)
    .single()

  if (invErr || !invoice) return { error: 'Invoice não encontrada.' }
  if (invoice.status !== 'paid_by_gc') {
    return { error: 'Invoice precisa estar em paid_by_gc antes do cash.' }
  }
  if (!invoice.client_id || !invoice.amount_received) {
    return { error: 'Invoice sem cliente ou sem valor recebido.' }
  }

  const clientRow = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client
  const feePercent = clientRow?.fee_percent_override ?? operator.default_fee_percent
  const amountReceived = Number(invoice.amount_received)
  const feeAmount = Math.round(amountReceived * (feePercent / 100) * 100) / 100

  // 2. Find unsettled advances (ledger entries com entry_type='advance_paid' e sem settled_by_invoice_id)
  const { data: pendingAdvances } = await supabase
    .from('ops_ledger_entries')
    .select('id, amount')
    .eq('client_id', invoice.client_id)
    .eq('entry_type', 'advance_paid')
    .is('settled_by_invoice_id', null)

  const totalAdvances = (pendingAdvances ?? []).reduce((sum, a) => sum + Number(a.amount), 0)

  // 3. Running balance starting from latest entry
  const { data: lastEntry } = await supabase
    .from('ops_ledger_entries')
    .select('balance_after')
    .eq('client_id', invoice.client_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let running = lastEntry ? Number(lastEntry.balance_after) : 0

  // 4. Insert three entries sequentially (balance_after depends on previous)
  const today = new Date().toISOString().split('T')[0]
  const entries = [
    {
      entry_type: 'gc_payment_received' as const,
      amount: amountReceived,
      description: 'GC pagou invoice',
    },
    {
      entry_type: 'operator_fee' as const,
      amount: -feeAmount,
      description: `Porcentagem do operador (${feePercent}%)`,
    },
    {
      entry_type: 'cash_paid_full' as const,
      amount: -(amountReceived - feeAmount),
      description: 'Cash entregue ao cliente',
    },
  ]

  for (const e of entries) {
    running = Math.round((running + e.amount) * 100) / 100
    const { error: insErr } = await supabase.from('ops_ledger_entries').insert({
      operator_id: operator.id,
      client_id: invoice.client_id,
      entry_type: e.entry_type,
      amount: e.amount,
      balance_after: running,
      invoice_id: invoiceId,
      description: e.description,
      entry_date: today,
      created_by: operator.user_id,
    })
    if (insErr) return { error: insErr.message }
  }

  // 5. Settle advances (if any)
  if ((pendingAdvances ?? []).length > 0) {
    await supabase
      .from('ops_ledger_entries')
      .update({ settled_by_invoice_id: invoiceId })
      .in('id', (pendingAdvances ?? []).map((a) => a.id))
  }

  // 6. Lock the invoice
  const nowIso = new Date().toISOString()
  await supabase
    .from('ops_invoices')
    .update({
      status: 'locked',
      paid_to_client_at: nowIso,
      locked_at: nowIso,
    })
    .eq('id', invoiceId)
    .eq('operator_id', operator.id)

  // Note: esse último update para status='locked' passa pela policy
  // ops_invoices_update_unlocked porque o status ANTES do update é paid_by_gc.

  revalidatePath('/statement')
  revalidatePath('/inbox')
  revalidatePath('/clients')
  return { error: null }
}
