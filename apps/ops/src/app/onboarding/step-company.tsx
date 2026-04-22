'use client'

import { useActionState } from 'react'
import { createCompanyAction, type OnboardingState } from './actions'

const initial: OnboardingState = { error: null }

export function StepCompany() {
  const [state, formAction, pending] = useActionState(createCompanyAction, initial)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="form-label" htmlFor="legal_name">Nome legal</label>
        <input
          id="legal_name"
          name="legal_name"
          required
          autoFocus
          className="form-input"
          placeholder="JK Construction Ltd"
        />
      </div>

      <div>
        <label className="form-label" htmlFor="trade_name">Nome fantasia (opcional)</label>
        <input
          id="trade_name"
          name="trade_name"
          className="form-input"
          placeholder="JK Construction"
        />
      </div>

      <div className="grid gap-2.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
        <input
          id="address"
          name="address"
          className="form-input"
          placeholder="Ottawa, ON"
        />
      </div>

      <div>
        <label className="form-label" htmlFor="invoice_prefix">
          Prefixo de invoice
        </label>
        <input
          id="invoice_prefix"
          name="invoice_prefix"
          required
          className="form-input"
          placeholder="JK-A"
          style={{ textTransform: 'uppercase' }}
        />
        <div className="font-mono text-[11px] text-ink-3 mt-1.5">
          Usado pra numerar suas invoices (ex: JK-A-0047).
        </div>
      </div>

      {state.error && (
        <div
          className="px-3.5 py-2.5 bg-red-soft font-mono text-[12px] text-red font-semibold"
          style={{ borderLeft: '3px solid #DC2626' }}
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {pending ? 'Salvando…' : 'Cadastrar empresa'}
      </button>
    </form>
  )
}
