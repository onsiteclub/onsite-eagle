'use client'

import { useActionState } from 'react'
import { sendExportAction, type ExportState } from './actions'

const initial: ExportState = { ok: false, message: null, downloadUrl: null }

export function SendExportButton({
  companyId,
  from,
  to,
  email,
  invoiceCount,
}: {
  companyId: string
  from: string
  to: string
  email: string
  invoiceCount: number
}) {
  const [state, formAction, pending] = useActionState(sendExportAction, initial)

  const canSend = invoiceCount > 0 && !!email

  return (
    <form action={formAction} className="mt-5">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="email" value={email} />

      <button
        type="submit"
        disabled={pending || !canSend}
        className="btn btn-primary disabled:opacity-50"
        title={canSend ? undefined : 'Sem invoices finalizadas no período ou sem email do contador'}
      >
        {pending ? 'Gerando ZIP…' : 'Enviar ZIP por email'}
      </button>

      {state.message && (
        <div
          className={[
            'mt-4 px-3.5 py-2.5 font-mono text-[12px] font-semibold',
            state.ok ? 'bg-green-soft text-green' : 'bg-red-soft text-red',
          ].join(' ')}
          style={{
            borderLeft: state.ok ? '3px solid #16A34A' : '3px solid #DC2626',
          }}
        >
          {state.message}
          {state.downloadUrl && (
            <>
              {' · '}
              <a
                href={state.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Baixar ZIP
              </a>
            </>
          )}
        </div>
      )}
    </form>
  )
}
