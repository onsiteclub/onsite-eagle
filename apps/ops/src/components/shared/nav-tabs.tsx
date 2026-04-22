import { requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NavTabLink } from './nav-tabs-link'

export async function NavTabs() {
  const operator = await requireOperator()
  const supabase = await createClient()

  const [{ count: inboxCount }, { count: clientsCount }] = await Promise.all([
    supabase
      .from('ops_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', operator.id)
      .in('status', ['pending', 'new_sender']),
    supabase
      .from('ops_clients')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', operator.id)
      .eq('status', 'active'),
  ])

  return (
    <nav className="max-w-[880px] mx-auto px-7 pt-9 pb-6 flex gap-1">
      <NavTabLink href="/inbox" label="Caixa de Entrada" count={inboxCount ?? 0} />
      <NavTabLink href="/statement" label="Extrato" />
      <NavTabLink href="/clients" label="Clientes" count={clientsCount ?? 0} />
      <NavTabLink href="/export" label="Enviar ao contador" />
    </nav>
  )
}
