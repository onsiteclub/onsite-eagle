'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { loginAction, type AuthState } from '../actions'

const initialState: AuthState = { error: null }

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <h1
        className="font-black text-[24px] uppercase"
        style={{ letterSpacing: '-0.02em' }}
      >
        Entrar
      </h1>

      <div>
        <label className="form-label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="form-input"
          autoFocus
        />
      </div>

      <div>
        <label className="form-label" htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? 'Entrando…' : 'Entrar'}
      </button>

      <div className="text-center pt-2 font-mono text-[11px] text-ink-3">
        Sem conta?{' '}
        <Link href="/signup" className="text-ink font-semibold underline">
          Criar conta
        </Link>
      </div>
    </form>
  )
}
