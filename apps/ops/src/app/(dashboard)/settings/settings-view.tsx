'use client'

import { TopbarCopyButton } from '@/components/shared/topbar-copy-button'
import { useActionState, useState, useTransition } from 'react'
import {
  addCompanyAction,
  setAccountantAction,
  toggleCompanyActiveAction,
  unblockSenderAction,
  updateOperatorAction,
  type SettingsActionState,
} from './actions'

const initialState: SettingsActionState = { error: null }

type Company = {
  id: string
  legal_name: string
  trade_name: string | null
  hst_number: string | null
  invoice_prefix: string
  is_active: boolean
}

type BlockedSender = {
  id: string
  blocked_email: string
  reason: string | null
  blocked_at: string
}

export function SettingsView({
  inboxAddress,
  operator,
  companies,
  accountantEmail,
  accountantName,
  blocklist,
}: {
  inboxAddress: string
  operator: {
    display_name: string
    default_fee_percent: number
  }
  companies: Company[]
  accountantEmail: string
  accountantName: string
  blocklist: BlockedSender[]
}) {
  return (
    <div className="flex flex-col gap-8 max-w-[640px]">
      <InboxSection inboxAddress={inboxAddress} />
      <OperatorSection operator={operator} />
      <CompaniesSection companies={companies} />
      <AccountantSection email={accountantEmail} name={accountantName} />
      <BlocklistSection blocklist={blocklist} />
    </div>
  )
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="font-black text-[14px] uppercase tracking-[-0.01em]">
        {title}
      </div>
      {hint && (
        <div className="font-mono text-[11px] text-ink-3 mt-1">{hint}</div>
      )}
    </div>
  )
}

function StatusLine({ state }: { state: SettingsActionState }) {
  if (state.error) {
    return (
      <div className="font-mono text-[12px] text-red mt-2">{state.error}</div>
    )
  }
  if (state.ok) {
    return (
      <div className="font-mono text-[12px] text-green mt-2">Salvo.</div>
    )
  }
  return null
}

// =============================================================================
// Inbox address (readonly)
// =============================================================================

function InboxSection({ inboxAddress }: { inboxAddress: string }) {
  return (
    <section>
      <SectionHeader
        title="Endereço de inbox"
        hint="Seus clientes mandam invoices pra este email. Não pode mudar."
      />
      <div className="px-3 py-2.5 bg-paper border border-line flex items-center justify-between font-mono text-[13px]">
        <code>{inboxAddress}</code>
        <TopbarCopyButton address={inboxAddress} />
      </div>
    </section>
  )
}

// =============================================================================
// Operator profile
// =============================================================================

function OperatorSection({
  operator,
}: {
  operator: { display_name: string; default_fee_percent: number }
}) {
  const [state, action, pending] = useActionState(
    updateOperatorAction,
    initialState,
  )

  return (
    <section>
      <SectionHeader
        title="Perfil"
        hint="Porcentagem padrão aplicada quando cliente novo não tem override."
      />
      <form action={action} className="flex flex-col gap-3">
        <div>
          <label className="form-label" htmlFor="display_name">
            Nome
          </label>
          <input
            id="display_name"
            name="display_name"
            defaultValue={operator.display_name}
            className="form-input"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="default_fee_percent">
            Porcentagem padrão (%)
          </label>
          <input
            id="default_fee_percent"
            name="default_fee_percent"
            type="number"
            min={0}
            max={100}
            step={0.5}
            defaultValue={operator.default_fee_percent}
            className="form-input"
            required
          />
        </div>
        <div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
          <StatusLine state={state} />
        </div>
      </form>
    </section>
  )
}

// =============================================================================
// Companies
// =============================================================================

function CompaniesSection({ companies }: { companies: Company[] }) {
  const [addState, addAction, adding] = useActionState(
    addCompanyAction,
    initialState,
  )
  const [showForm, setShowForm] = useState(companies.length === 0)
  const [toggling, startTransition] = useTransition()

  function onToggle(c: Company) {
    startTransition(async () => {
      await toggleCompanyActiveAction(c.id, !c.is_active)
    })
  }

  return (
    <section>
      <SectionHeader
        title="Empresas"
        hint="Cada invoice é emitida em nome de uma empresa sua (JK, Maple etc.)."
      />

      <div className="border border-line bg-paper">
        {companies.length === 0 ? (
          <div className="px-3 py-4 font-mono text-[12px] text-ink-3 text-center">
            Nenhuma empresa cadastrada.
          </div>
        ) : (
          companies.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-3 py-2.5 border-b border-line last:border-b-0"
            >
              <div>
                <div className="font-bold text-[13px]">
                  {c.trade_name || c.legal_name}
                </div>
                <div className="font-mono text-[11px] text-ink-3">
                  {c.legal_name}
                  {c.hst_number && ` · HST ${c.hst_number}`}
                  {' · '}prefixo {c.invoice_prefix}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggle(c)}
                disabled={toggling}
                className={[
                  'font-mono text-[11px] uppercase tracking-wide px-2 py-1 border cursor-pointer',
                  c.is_active
                    ? 'border-green text-green bg-green-soft'
                    : 'border-line text-ink-3 bg-paper-2',
                ].join(' ')}
              >
                {c.is_active ? 'Ativa' : 'Inativa'}
              </button>
            </div>
          ))
        )}
      </div>

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn btn-ghost mt-3"
        >
          + Adicionar empresa
        </button>
      )}

      {showForm && (
        <form action={addAction} className="flex flex-col gap-3 mt-4 p-4 bg-paper-2 border border-line">
          <div className="font-black text-[12px] uppercase tracking-[-0.01em]">
            Nova empresa
          </div>
          <div>
            <label className="form-label" htmlFor="legal_name">
              Razão social
            </label>
            <input
              id="legal_name"
              name="legal_name"
              className="form-input"
              placeholder="JK Construction Ltd"
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="trade_name">
              Nome fantasia
            </label>
            <input
              id="trade_name"
              name="trade_name"
              className="form-input"
              placeholder="JK Construction"
            />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label className="form-label" htmlFor="hst_number">HST #</label>
              <input
                id="hst_number"
                name="hst_number"
                className="form-input"
                placeholder="123456789RT0001"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="wsib_number">WSIB #</label>
              <input
                id="wsib_number"
                name="wsib_number"
                className="form-input"
                placeholder="opcional"
              />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="address">Endereço</label>
            <input id="address" name="address" className="form-input" />
          </div>
          <div>
            <label className="form-label" htmlFor="invoice_prefix">
              Prefixo de invoice
            </label>
            <input
              id="invoice_prefix"
              name="invoice_prefix"
              className="form-input"
              placeholder="JK-A"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? 'Adicionando…' : 'Adicionar'}
            </button>
          </div>
          <StatusLine state={addState} />
        </form>
      )}
    </section>
  )
}

// =============================================================================
// Accountant contact
// =============================================================================

function AccountantSection({
  email,
  name,
}: {
  email: string
  name: string
}) {
  const [state, action, pending] = useActionState(
    setAccountantAction,
    initialState,
  )

  return (
    <section>
      <SectionHeader
        title="Contador"
        hint="Email que recebe o fechamento. Deixe em branco pra remover."
      />
      <form action={action} className="flex flex-col gap-3">
        <div>
          <label className="form-label" htmlFor="accountant-name">
            Nome
          </label>
          <input
            id="accountant-name"
            name="name"
            defaultValue={name}
            className="form-input"
            placeholder="opcional"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="accountant-email">
            Email
          </label>
          <input
            id="accountant-email"
            name="email"
            type="email"
            defaultValue={email}
            className="form-input"
            placeholder="contador@fiscal.ca"
          />
        </div>
        <div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
          <StatusLine state={state} />
        </div>
      </form>
    </section>
  )
}

// =============================================================================
// Blocklist
// =============================================================================

function BlocklistSection({ blocklist }: { blocklist: BlockedSender[] }) {
  const [pending, startTransition] = useTransition()

  function onUnblock(id: string, email: string) {
    if (!confirm(`Desbloquear ${email}? Futuros emails voltam a ser recebidos.`))
      return
    startTransition(async () => {
      await unblockSenderAction(id)
    })
  }

  return (
    <section>
      <SectionHeader
        title="Remetentes bloqueados"
        hint="Emails que você recusou. Enquanto bloqueados, não criam invoices."
      />
      <div className="border border-line bg-paper">
        {blocklist.length === 0 ? (
          <div className="px-3 py-4 font-mono text-[12px] text-ink-3 text-center">
            Ninguém bloqueado.
          </div>
        ) : (
          blocklist.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between px-3 py-2.5 border-b border-line last:border-b-0"
            >
              <div>
                <div className="font-mono text-[12px]">{b.blocked_email}</div>
                {b.reason && (
                  <div className="font-mono text-[11px] text-ink-3 mt-0.5">
                    {b.reason}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onUnblock(b.id, b.blocked_email)}
                disabled={pending}
                className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 border border-line bg-paper-2 text-ink-2 hover:text-ink cursor-pointer"
              >
                Desbloquear
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
