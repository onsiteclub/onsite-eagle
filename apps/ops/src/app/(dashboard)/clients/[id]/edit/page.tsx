import { requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EditClientView } from './edit-view'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const operator = await requireOperator()
  const supabase = await createClient()

  const [clientResp, companiesResp, accessResp] = await Promise.all([
    supabase
      .from('ops_clients')
      .select('id, display_name, email, fee_percent_override, status')
      .eq('id', id)
      .eq('operator_id', operator.id)
      .maybeSingle(),
    supabase
      .from('ops_companies')
      .select('id, legal_name, trade_name')
      .eq('operator_id', operator.id)
      .eq('is_active', true)
      .order('legal_name'),
    supabase
      .from('ops_client_company_access')
      .select('company_id')
      .eq('client_id', id),
  ])

  if (!clientResp.data) notFound()

  const client = clientResp.data

  return (
    <>
      <Link href="/clients" className="font-mono text-[11px] text-ink-3 hover:text-ink">
        ← Voltar para clientes
      </Link>
      <h1 className="page-title mt-2">{client.display_name}</h1>
      <div className="page-subtitle">Editar dados do cliente</div>
      <div className="mt-6">
        <EditClientView
          client={{
            id: client.id,
            display_name: client.display_name,
            email: client.email,
            fee_percent_override: client.fee_percent_override,
            status: client.status as 'active' | 'blocked' | 'archived',
          }}
          companies={companiesResp.data ?? []}
          authorizedCompanyIds={(accessResp.data ?? []).map((a) => a.company_id)}
          defaultFeePercent={operator.default_fee_percent}
        />
      </div>
    </>
  )
}
