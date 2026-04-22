import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type CurrentOperator = {
  id: string
  user_id: string
  display_name: string
  inbox_username: string
  default_fee_percent: number
  email: string
}

/**
 * Retorna o operator + email do user logado.
 * Garantido no contexto de (dashboard) rotas — middleware redireciona antes
 * se não logado ou sem registro em ops_operators. Aqui lançamos redirect
 * apenas como defesa extra (ex: Server Action chamada de fora do dashboard).
 */
export async function requireOperator(): Promise<CurrentOperator> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id, user_id, display_name, inbox_username, default_fee_percent')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!operator) redirect('/onboarding')

  return {
    ...operator,
    email: user.email ?? '',
  }
}

export function initialsOf(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
