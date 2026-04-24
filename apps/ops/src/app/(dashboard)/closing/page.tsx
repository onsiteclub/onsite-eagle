import { HelperVoice } from '@/components/shared/helper-voice'
import { requireOperator } from '@/lib/auth'
import { formatCurrencyShort } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { SendExportButton } from './send-button'

function firstDayOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function lastDayOfMonth(): string {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; from?: string; to?: string; email?: string }>
}) {
  const operator = await requireOperator()
  const supabase = await createClient()
  const params = await searchParams

  const [{ data: companies }, { data: accountants }] = await Promise.all([
    supabase
      .from('ops_companies')
      .select('id, legal_name, trade_name')
      .eq('operator_id', operator.id)
      .eq('is_active', true)
      .order('legal_name'),
    supabase
      .from('ops_accountant_contacts')
      .select('email, is_primary')
      .eq('operator_id', operator.id)
      .order('is_primary', { ascending: false })
      .limit(1),
  ])

  if (!companies || companies.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="font-mono text-[12px] text-ink-3">
          Cadastre uma empresa primeiro pra enviar fechamento.
        </div>
      </div>
    )
  }

  const companyId = params.companyId ?? companies[0].id
  const from = params.from ?? firstDayOfMonth()
  const to = params.to ?? lastDayOfMonth()
  const email = params.email ?? accountants?.[0]?.email ?? ''

  const selectedCompany = companies.find((c) => c.id === companyId) ?? companies[0]

  // Invoices finalizadas (paid_by_gc + paid_to_client + locked) no período, pra company selecionada
  const { data: invoicesInRange } = await supabase
    .from('ops_invoices')
    .select('amount_gross, amount_hst')
    .eq('operator_id', operator.id)
    .eq('company_id', selectedCompany.id)
    .gte('received_at', `${from}T00:00:00Z`)
    .lte('received_at', `${to}T23:59:59Z`)
    .in('status', ['paid_by_gc', 'paid_to_client', 'locked'])

  const invoiceCount = invoicesInRange?.length ?? 0
  const totalAmount = (invoicesInRange ?? []).reduce(
    (sum, i) => sum + Number(i.amount_gross),
    0,
  )
  const totalHst = (invoicesInRange ?? []).reduce(
    (sum, i) => sum + Number(i.amount_hst ?? 0),
    0,
  )

  return (
    <>
    <form method="get" style={{ maxWidth: 600 }}>
      <h2
        className="font-black text-[24px] uppercase mb-5"
        style={{ letterSpacing: '-0.02em' }}
      >
        Enviar ao contador
      </h2>

      <div className="mb-3.5">
        <label className="form-label" htmlFor="companyId">Empresa</label>
        <select
          id="companyId"
          name="companyId"
          defaultValue={companyId}
          className="form-input"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="mb-3.5">
          <label className="form-label" htmlFor="from">De</label>
          <input id="from" name="from" type="date" defaultValue={from} className="form-input" />
        </div>
        <div className="mb-3.5">
          <label className="form-label" htmlFor="to">Até</label>
          <input id="to" name="to" type="date" defaultValue={to} className="form-input" />
        </div>
      </div>

      <div className="mb-3.5">
        <label className="form-label" htmlFor="email">Email do contador</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={email}
          placeholder="contador@fiscal.ca"
          className="form-input"
        />
      </div>

      <div className="flex gap-2 mt-2 mb-5">
        <button type="submit" className="btn btn-ghost">
          Recalcular preview
        </button>
      </div>

      <div
        className="px-5 py-4.5 bg-paper border border-line"
        style={{ paddingTop: 18, paddingBottom: 18 }}
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 mb-3">
          O envio conterá:
        </div>
        <Row label="Invoices no período" value={`${invoiceCount}`} />
        <Row label="PDFs individuais" value={`${invoiceCount} arquivo${invoiceCount === 1 ? '' : 's'}`} />
        <Row label="Planilha CSV (contábil)" value="1 arquivo" />
        <Row label="Relatório resumido PDF" value="1 arquivo" />
        <div className="flex justify-between pt-2.5 mt-2 font-bold border-t border-line">
          <span>Total faturado</span>
          <strong className="font-mono">{formatCurrencyShort(totalAmount)}</strong>
        </div>
        <div className="flex justify-between py-1 font-bold">
          <span>HST coletado</span>
          <strong className="font-mono">{formatCurrencyShort(totalHst)}</strong>
        </div>
      </div>

      </form>

      <div style={{ maxWidth: 600 }}>
        <SendExportButton
          companyId={companyId}
          from={from}
          to={to}
          email={email}
          invoiceCount={invoiceCount}
        />

        <HelperVoice className="mt-5">
          <strong className="text-ink font-bold">Dica:</strong> avisa o contador pelo WhatsApp antes
          — &quot;vou te mandar o fechamento de abril por email&quot;. Assim ele não perde no meio de outros
          emails.
        </HelperVoice>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-[13px]">
      <span>{label}</span>
      <strong className="font-mono">{value}</strong>
    </div>
  )
}
