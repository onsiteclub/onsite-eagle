'use client'

import { unrejectInvoiceAction } from '@/app/(dashboard)/inbox/actions'
import { formatCurrencyShort } from '@/lib/format'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export type RejectedRow = {
  id: string
  fromName: string
  fromEmail: string
  subject: string
  amount: number | null
  dateLabel: string
  timeLabel: string
}

export function RejectedView({ rows }: { rows: RejectedRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onUnreject(row: RejectedRow) {
    if (
      !confirm(
        `Voltar ${row.fromEmail} para a caixa? O invoice volta a aparecer como "Novo remetente".`,
      )
    )
      return
    startTransition(async () => {
      await unrejectInvoiceAction(row.id)
      router.refresh()
    })
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center font-mono text-[12px] text-ink-3">
        Nenhum invoice rejeitado.
      </div>
    )
  }

  return (
    <>
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid gap-4 py-4 border-b border-line items-center"
          style={{ gridTemplateColumns: '80px 1fr auto auto' }}
        >
          <div className="font-mono text-[11px] font-medium text-ink-2 uppercase tracking-[0.05em]">
            {row.dateLabel}
            <br />
            <span className="text-ink-3">{row.timeLabel}</span>
          </div>
          <div>
            <div className="font-bold text-[14px]">{row.fromName}</div>
            <div className="font-mono text-[11px] text-ink-3 mt-0.5">{row.fromEmail}</div>
            <div className="font-mono text-[12px] text-ink-2 mt-[3px]">{row.subject}</div>
          </div>
          <div className="font-mono text-[13px] font-semibold text-ink-3">
            {row.amount === null ? '—' : formatCurrencyShort(row.amount)}
          </div>
          <button
            type="button"
            onClick={() => onUnreject(row)}
            disabled={pending}
            className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 border border-line bg-paper-2 text-ink-2 hover:text-ink cursor-pointer"
          >
            Reabrir
          </button>
        </div>
      ))}
    </>
  )
}
