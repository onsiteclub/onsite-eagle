'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type AuthState = { error: string | null }

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email e senha são obrigatórios.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: translateAuthError(error.message) }
  }

  // Middleware decide /inbox vs /onboarding baseado em ops_operators.
  redirect('/')
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email e senha são obrigatórios.' }
  }
  if (password.length < 8) {
    return { error: 'Senha precisa de pelo menos 8 caracteres.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: translateAuthError(error.message) }
  }

  redirect('/')
}

export async function signoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login')) return 'Email ou senha incorretos.'
  if (lower.includes('already registered') || lower.includes('user already'))
    return 'Este email já tem conta. Faça login.'
  if (lower.includes('email not confirmed'))
    return 'Confirme seu email antes de entrar (veja sua caixa de entrada).'
  return message
}
