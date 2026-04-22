'use client'

import { useActionState, useState } from 'react'
import { createOperatorAction, type OnboardingState } from './actions'

const initial: OnboardingState = { error: null }

export function StepOperator({ inboxDomain }: { inboxDomain: string }) {
  const [state, formAction, pending] = useActionState(createOperatorAction, initial)
  const [username, setUsername] = useState('')

  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="form-label" htmlFor="display_name">Seu nome</label>
        <input
          id="display_name"
          name="display_name"
          required
          autoFocus
          className="form-input"
          placeholder="Paulo Ribeiro"
        />
      </div>

      <div>
        <label className="form-label" htmlFor="inbox_username">
          Escolha seu username do inbox
        </label>
        <input
          id="inbox_username"
          name="inbox_username"
          required
          className="form-input"
          placeholder="paulo"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
        />
        <div className="font-mono text-[11px] text-ink-3 mt-1.5">
          Invoices vão chegar em{' '}
          <strong className="text-ink">
            {normalized || 'seuusername'}@{inboxDomain}
          </strong>
        </div>
      </div>

      <div>
        <label className="form-label" htmlFor="default_fee_percent">
          Porcentagem padrão do operador (%)
        </label>
        <input
          id="default_fee_percent"
          name="default_fee_percent"
          type="number"
          min={0}
          max={100}
          step={0.5}
          defaultValue="15"
          required
          className="form-input"
        />
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
        {pending ? 'Reservando…' : 'Reservar este email'}
      </button>
    </form>
  )
}
