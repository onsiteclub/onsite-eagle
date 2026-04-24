import { requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { SettingsView } from './settings-view'

const INBOX_DOMAIN = process.env.INBOX_DOMAIN ?? 'inbox.onsiteclub.ca'

export default async function SettingsPage() {
  const operator = await requireOperator()
  const supabase = await createClient()

  const [companiesResp, accountantResp, blocklistResp] = await Promise.all([
    supabase
      .from('ops_companies')
      .select('id, legal_name, trade_name, hst_number, invoice_prefix, is_active')
      .eq('operator_id', operator.id)
      .order('is_active', { ascending: false })
      .order('legal_name'),
    supabase
      .from('ops_accountant_contacts')
      .select('email, name')
      .eq('operator_id', operator.id)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ops_inbox_blocklist')
      .select('id, blocked_email, reason, blocked_at')
      .eq('operator_id', operator.id)
      .order('blocked_at', { ascending: false }),
  ])

  const inboxAddress = `${operator.inbox_username}@${INBOX_DOMAIN}`

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <div className="page-subtitle">
        Perfil, empresas, contador e remetentes bloqueados
      </div>
      <div className="mt-6">
        <SettingsView
          inboxAddress={inboxAddress}
          operator={{
            display_name: operator.display_name,
            default_fee_percent: operator.default_fee_percent,
          }}
          companies={companiesResp.data ?? []}
          accountantEmail={accountantResp.data?.email ?? ''}
          accountantName={accountantResp.data?.name ?? ''}
          blocklist={blocklistResp.data ?? []}
        />
      </div>
    </>
  )
}
