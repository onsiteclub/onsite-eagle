'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signupAction, type AuthState } from '../actions'

const initialState: AuthState = { error: null }

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <h1
        className="font-black text-[24px] uppercase"
        style={{ letterSpacing: '-0.02em' }}
      >
        Criar conta
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
          autoComplete="new-password"
          required
          minLength={8}
          className="form-input"
        />
        <div className="font-mono text-[10px] text-ink-3 mt-1">
          Mínimo 8 caracteres.
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
        {pending ? 'Criando…' : 'Criar conta'}
      </button>

      <div className="text-center pt-2 font-mono text-[11px] text-ink-3">
        Já tem conta?{' '}
        <Link href="/login" className="text-ink font-semibold underline">
          Entrar
        </Link>
      </div>
    </form>
  )
}
