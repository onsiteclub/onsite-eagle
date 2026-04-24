'use server'

import { requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ClientEditState = { error: string | null; ok?: boolean }

export async function updateClientAction(
  clientId: string,
  _prev: ClientEditState,
  formData: FormData,
): Promise<ClientEditState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const displayName = String(formData.get('display_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const feeRaw = String(formData.get('fee_percent_override') ?? '').trim()
  const status = String(formData.get('status') ?? 'active')
  const companyIds = formData.getAll('company_ids').map(String)

  if (!displayName) return { error: 'Nome é obrigatório.' }
  if (!email) return { error: 'Email é obrigatório.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email inválido.' }
  }
  if (!['active', 'blocked', 'archived'].includes(status)) {
    return { error: 'Status inválido.' }
  }

  // Empty fee = use operator's default (null override)
  let feeOverride: number | null = null
  if (feeRaw !== '') {
    const n = Number(feeRaw)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { error: 'Porcentagem precisa ser entre 0 e 100.' }
    }
    feeOverride = n
  }

  // Defense in depth: verify ownership before touching the row.
  const { data: existing } = await supabase
    .from('ops_clients')
    .select('id')
    .eq('id', clientId)
    .eq('operator_id', operator.id)
    .maybeSingle()
  if (!existing) return { error: 'Cliente não encontrado.' }

  const { error: updateErr } = await supabase
    .from('ops_clients')
    .update({
      display_name: displayName,
      email,
      fee_percent_override: feeOverride,
      status,
    })
    .eq('id', clientId)
    .eq('operator_id', operator.id)

  if (updateErr) {
    return {
      error: updateErr.message.includes('duplicate')
        ? 'Outro cliente seu já usa esse email.'
        : updateErr.message,
    }
  }

  // Sync company access: diff current vs desired.
  // Simpler: wipe and reinsert (small lists; fine).
  await supabase
    .from('ops_client_company_access')
    .delete()
    .eq('client_id', clientId)

  if (companyIds.length > 0) {
    await supabase
      .from('ops_client_company_access')
      .insert(
        companyIds.map((company_id) => ({ client_id: clientId, company_id })),
      )
  }

  revalidatePath('/clients')
  revalidatePath(`/statement`)
  return { error: null, ok: true }
}

export async function archiveClientAction(clientId: string): Promise<void> {
  const operator = await requireOperator()
  const supabase = await createClient()

  await supabase
    .from('ops_clients')
    .update({ status: 'archived' })
    .eq('id', clientId)
    .eq('operator_id', operator.id)

  revalidatePath('/clients')
  redirect('/clients')
}
