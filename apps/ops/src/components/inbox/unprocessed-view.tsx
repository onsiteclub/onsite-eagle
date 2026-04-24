'use client'

import { resolveUnprocessedAction } from '@/app/(dashboard)/inbox/actions'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export type UnprocessedRow = {
  id: string
  fromName: string
  fromEmail: string
  subject: string
  reason: string
  dateLabel: string
  timeLabel: string
}

const reasonLabel: Record<string, string> = {
  no_pdf: 'sem PDF anexado',
  pdf_unreadable: 'PDF ilegível',
  blocked_recovered: 'recuperado de bloqueio',
  other: 'outro motivo',
}

export function UnprocessedView({ rows }: { rows: UnprocessedRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onResolve(row: UnprocessedRow) {
    if (
      !confirm(
        `Descartar email de ${row.fromEmail}? Ele some desta caixa mas fica registrado.`,
      )
    )
      return
    startTransition(async () => {
      await resolveUnprocessedAction(row.id)
      router.refresh()
    })
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center font-mono text-[12px] text-ink-3">
        Nenhum email sem PDF pendente.
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 px-3 py-2.5 bg-yellow-soft border border-yellow font-mono text-[12px]">
        <strong>O que é isso?</strong> Emails que chegaram mas não tinham PDF anexado.
        Avise o remetente pelo WhatsApp pra reenviar, depois descarte aqui.
      </div>
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
          <div className="font-mono text-[11px] text-ink-3 uppercase tracking-wide">
            {reasonLabel[row.reason] ?? row.reason}
          </div>
          <button
            type="button"
            onClick={() => onResolve(row)}
            disabled={pending}
            className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 border border-line bg-paper-2 text-ink-2 hover:text-ink cursor-pointer"
          >
            Descartar
          </button>
        </div>
      ))}
    </>
  )
}
