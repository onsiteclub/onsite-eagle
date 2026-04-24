'use server'

import { requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type InboxActionState = { error: string | null }

export async function addClientAction(
  _prev: InboxActionState,
  formData: FormData,
): Promise<InboxActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const invoiceId = String(formData.get('invoice_id') ?? '')
  const displayName = String(formData.get('display_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const feePercentRaw = String(formData.get('fee_percent') ?? '')
  const companyIds = formData.getAll('company_ids').map(String)

  if (!invoiceId) return { error: 'Invoice ID faltando.' }
  if (!displayName) return { error: 'Nome é obrigatório.' }
  if (!email) return { error: 'Email é obrigatório.' }

  const feePercent = Number(feePercentRaw)
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
    return { error: 'Porcentagem precisa ser entre 0 e 100.' }
  }

  // 1. Fetch the invoice (validation + amount for ledger)
  const { data: invoice, error: invErr } = await supabase
    .from('ops_invoices')
    .select('id, amount_gross, invoice_number')
    .eq('id', invoiceId)
    .eq('operator_id', operator.id)
    .single()
  if (invErr || !invoice) return { error: 'Invoice não encontrada.' }

  // 2. Create client (upsert defensively on (operator_id, email))
  const { data: client, error: clientErr } = await supabase
    .from('ops_clients')
    .insert({
      operator_id: operator.id,
      email,
      display_name: displayName,
      fee_percent_override: feePercent,
      first_invoice_at: new Date().toISOString(),
      status: 'active',
    })
    .select('id')
    .single()
  if (clientErr || !client) {
    return {
      error: clientErr?.message.includes('duplicate')
        ? 'Este email já está cadastrado como cliente.'
        : clientErr?.message ?? 'Erro ao criar cliente.',
    }
  }

  // 3. Authorize companies
  if (companyIds.length > 0) {
    await supabase.from('ops_client_company_access').insert(
      companyIds.map((company_id) => ({
        client_id: client.id,
        company_id,
      })),
    )
  }

  // 4. Attach invoice to client + approve
  await supabase
    .from('ops_invoices')
    .update({
      client_id: client.id,
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  // 5. Record ledger entry (débito = negativo)
  await supabase.from('ops_ledger_entries').insert({
    operator_id: operator.id,
    client_id: client.id,
    entry_type: 'invoice_received',
    amount: -invoice.amount_gross,
    balance_after: -invoice.amount_gross,
    invoice_id: invoice.id,
    description: `Invoice ${invoice.invoice_number ?? invoice.id.slice(0, 8)}`,
    entry_date: new Date().toISOString().split('T')[0],
    created_by: operator.user_id,
  })

  revalidatePath('/inbox')
  revalidatePath('/clients')
  return { error: null }
}

export async function linkInvoiceToClientAction(
  invoiceId: string,
  clientId: string,
): Promise<InboxActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  // Verify both belong to this operator (defense in depth; RLS enforces it too)
  const { data: invoice, error: invErr } = await supabase
    .from('ops_invoices')
    .select('id, amount_gross, invoice_number, status')
    .eq('id', invoiceId)
    .eq('operator_id', operator.id)
    .single()
  if (invErr || !invoice) return { error: 'Invoice não encontrada.' }
  if (invoice.status !== 'new_sender') {
    return { error: 'Invoice já foi processada.' }
  }

  const { data: client, error: clientErr } = await supabase
    .from('ops_clients')
    .select('id')
    .eq('id', clientId)
    .eq('operator_id', operator.id)
    .single()
  if (clientErr || !client) return { error: 'Cliente não encontrado.' }

  // Attach invoice to client + approve
  await supabase
    .from('ops_invoices')
    .update({
      client_id: client.id,
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  // Compute running balance from last entry for this client
  const { data: lastEntry } = await supabase
    .from('ops_ledger_entries')
    .select('balance_after')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const prevBalance = lastEntry?.balance_after ?? 0
  const balanceAfter = Number(prevBalance) - Number(invoice.amount_gross)

  await supabase.from('ops_ledger_entries').insert({
    operator_id: operator.id,
    client_id: client.id,
    entry_type: 'invoice_received',
    amount: -invoice.amount_gross,
    balance_after: balanceAfter,
    invoice_id: invoice.id,
    description: `Invoice ${invoice.invoice_number ?? invoice.id.slice(0, 8)}`,
    entry_date: new Date().toISOString().split('T')[0],
    created_by: operator.user_id,
  })

  revalidatePath('/inbox')
  revalidatePath('/clients')
  revalidatePath(`/statement`)
  return { error: null }
}

export async function unrejectInvoiceAction(
  invoiceId: string,
): Promise<InboxActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  // Move invoice back to new_sender so operator can re-approve it.
  const { error } = await supabase
    .from('ops_invoices')
    .update({ status: 'new_sender' })
    .eq('id', invoiceId)
    .eq('operator_id', operator.id)
    .eq('status', 'rejected')

  if (error) return { error: error.message }

  revalidatePath('/inbox')
  return { error: null }
}

export async function resolveUnprocessedAction(
  unprocessedId: string,
): Promise<InboxActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const { error } = await supabase
    .from('ops_inbox_unprocessed')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', unprocessedId)
    .eq('operator_id', operator.id)

  if (error) return { error: error.message }

  revalidatePath('/inbox')
  return { error: null }
}

export async function rejectSenderAction(
  invoiceId: string,
  blockEmail: boolean,
): Promise<InboxActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('ops_invoices')
    .select('from_email')
    .eq('id', invoiceId)
    .eq('operator_id', operator.id)
    .single()

  await supabase
    .from('ops_invoices')
    .update({ status: 'rejected' })
    .eq('id', invoiceId)
    .eq('operator_id', operator.id)

  if (blockEmail && invoice?.from_email) {
    await supabase.from('ops_inbox_blocklist').insert({
      operator_id: operator.id,
      blocked_email: invoice.from_email,
      reason: 'Rejeitado no onboarding',
    })
  }

  revalidatePath('/inbox')
  return { error: null }
}
