'use client'

import { useActionState, useTransition } from 'react'
import {
  archiveClientAction,
  updateClientAction,
  type ClientEditState,
} from './actions'

const initial: ClientEditState = { error: null }

type Company = { id: string; legal_name: string; trade_name: string | null }

export function EditClientView({
  client,
  companies,
  authorizedCompanyIds,
  defaultFeePercent,
}: {
  client: {
    id: string
    display_name: string
    email: string
    fee_percent_override: number | null
    status: 'active' | 'blocked' | 'archived'
  }
  companies: Company[]
  authorizedCompanyIds: string[]
  defaultFeePercent: number
}) {
  const updateBound = updateClientAction.bind(null, client.id)
  const [state, action, pending] = useActionState(updateBound, initial)
  const [archiving, startTransition] = useTransition()

  function onArchive() {
    if (
      !confirm(
        `Arquivar ${client.display_name}? Ele some da lista, mas o histórico fica preservado.`,
      )
    )
      return
    startTransition(async () => {
      await archiveClientAction(client.id)
    })
  }

  return (
    <form action={action} className="flex flex-col gap-4 max-w-[560px]">
      <div>
        <label className="form-label" htmlFor="display_name">
          Nome
        </label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={client.display_name}
          className="form-input"
          required
        />
      </div>

      <div>
        <label className="form-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={client.email}
          className="form-input"
          required
        />
        <div className="font-mono text-[11px] text-ink-3 mt-1">
          Se mudar, invoices antigos continuam vinculados — futuros usam o novo.
        </div>
      </div>

      <div>
        <label className="form-label" htmlFor="fee_percent_override">
          Porcentagem (%)
        </label>
        <input
          id="fee_percent_override"
          name="fee_percent_override"
          type="number"
          min={0}
          max={100}
          step={0.5}
          defaultValue={client.fee_percent_override ?? ''}
          placeholder={`${defaultFeePercent} (padrão)`}
          className="form-input"
        />
        <div className="font-mono text-[11px] text-ink-3 mt-1">
          Deixe vazio pra usar o padrão ({defaultFeePercent}%).
        </div>
      </div>

      <div>
        <label className="form-label">Empresas autorizadas</label>
        <div className="flex flex-col gap-2 mt-1">
          {companies.length === 0 ? (
            <div className="font-mono text-[12px] text-ink-3">
              Nenhuma empresa cadastrada. Vá em Settings.
            </div>
          ) : (
            companies.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 font-mono text-[12px] cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="company_ids"
                  value={c.id}
                  defaultChecked={authorizedCompanyIds.includes(c.id)}
                />
                <span className="font-bold">{c.trade_name || c.legal_name}</span>
                {c.trade_name && (
                  <span className="text-ink-3">· {c.legal_name}</span>
                )}
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <label className="form-label" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={client.status}
          className="form-input"
        >
          <option value="active">Ativo</option>
          <option value="blocked">Bloqueado</option>
          <option value="archived">Arquivado</option>
        </select>
      </div>

      {state.error && (
        <div className="font-mono text-[12px] text-red">{state.error}</div>
      )}
      {state.ok && (
        <div className="font-mono text-[12px] text-green">Salvo.</div>
      )}

      <div className="flex gap-2 mt-2 border-t border-line pt-4">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onArchive}
          disabled={archiving || client.status === 'archived'}
          className="btn btn-ghost ml-auto"
          style={{ color: 'var(--color-red)' }}
        >
          {archiving ? 'Arquivando…' : 'Arquivar cliente'}
        </button>
      </div>
    </form>
  )
}
