'use client'

import { useActionState } from 'react'
import {
  createAccountantAction,
  skipAccountantAction,
  type OnboardingState,
} from './actions'

const initial: OnboardingState = { error: null }

export function StepAccountant() {
  const [state, formAction, pending] = useActionState(createAccountantAction, initial)

  return (
    <form action={formAction} className="space-y-4">
      <div className="font-mono text-[12px] text-ink-2 pb-2">
        Adicione o email do seu contador agora ou pule e faça depois em
        Configurações.
      </div>

      <div>
        <label className="form-label" htmlFor="name">Nome do contador (opcional)</label>
        <input
          id="name"
          name="name"
          autoFocus
          className="form-input"
          placeholder="Nome"
        />
      </div>

      <div>
        <label className="form-label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="form-input"
          placeholder="contador@fiscal.ca"
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

      <div className="flex gap-2">
        <button
          type="submit"
          formAction={skipAccountantAction}
          className="btn btn-ghost flex-1"
        >
          Pular
        </button>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary flex-1 disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Salvar e entrar'}
        </button>
      </div>
    </form>
  )
}
