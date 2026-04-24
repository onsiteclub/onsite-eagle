'use server'

import { requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SettingsActionState = { error: string | null; ok?: boolean }

// =============================================================================
// Operator profile
// =============================================================================

export async function updateOperatorAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const displayName = String(formData.get('display_name') ?? '').trim()
  const feeRaw = String(formData.get('default_fee_percent') ?? '')
  if (!displayName) return { error: 'Nome é obrigatório.' }

  const fee = Number(feeRaw)
  if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
    return { error: 'Porcentagem precisa ser entre 0 e 100.' }
  }

  const { error } = await supabase
    .from('ops_operators')
    .update({ display_name: displayName, default_fee_percent: fee })
    .eq('id', operator.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { error: null, ok: true }
}

// =============================================================================
// Companies
// =============================================================================

export async function addCompanyAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const legalName = String(formData.get('legal_name') ?? '').trim()
  const tradeName = String(formData.get('trade_name') ?? '').trim()
  const hstNumber = String(formData.get('hst_number') ?? '').trim()
  const wsibNumber = String(formData.get('wsib_number') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const invoicePrefix = String(formData.get('invoice_prefix') ?? '').trim()

  if (!legalName) return { error: 'Razão social é obrigatória.' }
  if (!invoicePrefix) return { error: 'Prefixo de invoice é obrigatório.' }

  const { error } = await supabase.from('ops_companies').insert({
    operator_id: operator.id,
    legal_name: legalName,
    trade_name: tradeName || null,
    hst_number: hstNumber || null,
    wsib_number: wsibNumber || null,
    address: address || null,
    invoice_prefix: invoicePrefix.toUpperCase(),
  })

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { error: null, ok: true }
}

export async function toggleCompanyActiveAction(
  companyId: string,
  isActive: boolean,
): Promise<SettingsActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const { error } = await supabase
    .from('ops_companies')
    .update({ is_active: isActive })
    .eq('id', companyId)
    .eq('operator_id', operator.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { error: null, ok: true }
}

// =============================================================================
// Accountant contact (single row, upsert-style)
// =============================================================================

export async function setAccountantAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim()

  if (!email) {
    // Empty email = clear contact
    await supabase
      .from('ops_accountant_contacts')
      .delete()
      .eq('operator_id', operator.id)
    revalidatePath('/settings')
    return { error: null, ok: true }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email inválido.' }
  }

  // Simplest: delete existing, insert new primary.
  await supabase
    .from('ops_accountant_contacts')
    .delete()
    .eq('operator_id', operator.id)

  const { error } = await supabase.from('ops_accountant_contacts').insert({
    operator_id: operator.id,
    email,
    name: name || null,
    is_primary: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { error: null, ok: true }
}

// =============================================================================
// Blocklist
// =============================================================================

export async function unblockSenderAction(
  blocklistId: string,
): Promise<SettingsActionState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const { error } = await supabase
    .from('ops_inbox_blocklist')
    .delete()
    .eq('id', blocklistId)
    .eq('operator_id', operator.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { error: null, ok: true }
}
