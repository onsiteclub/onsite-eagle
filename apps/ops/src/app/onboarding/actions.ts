'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type OnboardingState = { error: string | null }

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
}

export async function createOperatorAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }

  const displayName = String(formData.get('display_name') ?? '').trim()
  const inboxUsernameRaw = String(formData.get('inbox_username') ?? '')
  const feePercentRaw = String(formData.get('default_fee_percent') ?? '15')

  const inboxUsername = normalizeUsername(inboxUsernameRaw)
  const feePercent = Number(feePercentRaw)

  if (!displayName) return { error: 'Nome é obrigatório.' }
  if (inboxUsername.length < 3) {
    return { error: 'Username precisa de pelo menos 3 caracteres (a-z, 0-9, ._-).' }
  }
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
    return { error: 'Porcentagem precisa ser entre 0 e 100.' }
  }

  // Check username uniqueness
  const { data: existing } = await supabase
    .from('ops_operators')
    .select('id')
    .eq('inbox_username', inboxUsername)
    .maybeSingle()

  if (existing) {
    return { error: `Username "${inboxUsername}" já está em uso. Tente outro.` }
  }

  const { error } = await supabase
    .from('ops_operators')
    .insert({
      user_id: user.id,
      display_name: displayName,
      inbox_username: inboxUsername,
      default_fee_percent: feePercent,
    })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/onboarding?step=company')
}

export async function createCompanyAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!operator) return { error: 'Complete o passo 1 primeiro.' }

  const legalName = String(formData.get('legal_name') ?? '').trim()
  const tradeName = String(formData.get('trade_name') ?? '').trim() || null
  const hstNumber = String(formData.get('hst_number') ?? '').trim() || null
  const wsibNumber = String(formData.get('wsib_number') ?? '').trim() || null
  const address = String(formData.get('address') ?? '').trim() || null
  const invoicePrefix = String(formData.get('invoice_prefix') ?? '').trim().toUpperCase()

  if (!legalName) return { error: 'Nome legal é obrigatório.' }
  if (!invoicePrefix) return { error: 'Prefixo de invoice é obrigatório (ex: JK-A).' }

  const { error } = await supabase.from('ops_companies').insert({
    operator_id: operator.id,
    legal_name: legalName,
    trade_name: tradeName,
    hst_number: hstNumber,
    wsib_number: wsibNumber,
    address,
    invoice_prefix: invoicePrefix,
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/onboarding?step=accountant')
}

export async function createAccountantAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!operator) return { error: 'Complete os passos anteriores primeiro.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim() || null

  if (!email) return { error: 'Email é obrigatório (ou pule este passo).' }

  const { error } = await supabase.from('ops_accountant_contacts').insert({
    operator_id: operator.id,
    email,
    name,
    is_primary: true,
  })

  if (error) return { error: error.message }

  redirect('/inbox')
}

export async function skipAccountantAction() {
  redirect('/inbox')
}
