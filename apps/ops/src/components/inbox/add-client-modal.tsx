'use client'

import { addClientAction, type InboxActionState } from '@/app/(dashboard)/inbox/actions'
import { Modal } from '@/components/shared/modal'
import { useActionState, useEffect, useState } from 'react'

const initial: InboxActionState = { error: null }

export type AddClientInvoice = {
  id: string
  from_name: string | null
  from_email: string
}

export type AddClientCompany = {
  id: string
  legal_name: string
  trade_name: string | null
}

export function AddClientModal({
  open,
  invoice,
  companies,
  defaultFeePercent,
  onClose,
  onSuccess,
}: {
  open: boolean
  invoice: AddClientInvoice | null
  companies: AddClientCompany[]
  defaultFeePercent: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [state, formAction, pending] = useActionState(addClientAction, initial)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open && invoice) {
      // Pré-seleciona todas as empresas (operador ajusta se quiser)
      const next: Record<string, boolean> = {}
      companies.forEach((c) => (next[c.id] = true))
      setSelected(next)
    }
  }, [open, invoice, companies])

  useEffect(() => {
    // Sucesso: action retornou error:null depois de submit (não é o estado inicial)
    if (!pending && state === initial) return
    if (!pending && state.error === null) {
      onSuccess()
    }
  }, [pending, state, onSuccess])

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (!invoice) {
    return <Modal open={open} onClose={onClose} title="Adicionar cliente"><div /></Modal>
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar cliente"
      maxWidth={480}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="add-client-form"
            disabled={pending}
            className="btn btn-primary disabled:opacity-50"
          >
            {pending ? 'Adicionando…' : 'Adicionar'}
          </button>
        </>
      }
    >
      <form id="add-client-form" action={formAction} className="space-y-3.5">
        <input type="hidden" name="invoice_id" value={invoice.id} />

        <div>
          <label className="form-label">Nome</label>
          <input
            className="form-input"
            name="display_name"
            defaultValue={invoice.from_name ?? ''}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="form-label">Email</label>
          <input
            className="form-input"
            name="email"
            value={invoice.from_email}
            readOnly
            style={{ background: '#F5F5F0', color: '#A1A1AA' }}
          />
        </div>

        <div>
          <label className="form-label">Porcentagem do operador</label>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: '1fr 80px' }}>
            <input
              type="number"
              className="form-input"
              name="fee_percent"
              defaultValue={defaultFeePercent}
              min={0}
              max={100}
              step={0.5}
              required
            />
            <div className="grid place-items-center text-ink-2 font-bold">%</div>
          </div>
        </div>

        <div>
          <label className="form-label">Empresas autorizadas</label>
          {companies.length === 0 && (
            <div className="font-mono text-[11px] text-ink-3">
              Nenhuma empresa cadastrada.
            </div>
          )}
          {companies.map((c) => {
            const isSel = !!selected[c.id]
            return (
              <div
                key={c.id}
                onClick={() => toggle(c.id)}
                className={[
                  'flex items-center gap-2 px-2.5 py-2 border cursor-pointer text-[13px] mb-1',
                  isSel ? 'bg-yellow-soft border-ink' : 'border-line',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-3.5 h-3.5 border-[1.5px] border-ink grid place-items-center',
                    isSel ? 'bg-ink' : '',
                  ].join(' ')}
                >
                  {isSel && (
                    <span className="text-yellow text-[10px] font-black leading-none">✓</span>
                  )}
                </div>
                {isSel && (
                  <input type="hidden" name="company_ids" value={c.id} />
                )}
                <span>{c.trade_name || c.legal_name}</span>
              </div>
            )
          })}
        </div>

        {state.error && (
          <div
            className="px-3.5 py-2.5 bg-red-soft font-mono text-[12px] text-red font-semibold"
            style={{ borderLeft: '3px solid #DC2626' }}
          >
            {state.error}
          </div>
        )}
      </form>
    </Modal>
  )
}
