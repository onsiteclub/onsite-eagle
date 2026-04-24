'use client'

import { dismissVersionAction } from '@/app/(dashboard)/inbox/actions'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export type DuplicateRow = {
  versionId: string
  invoiceId: string
  versionNumber: number
  fromName: string
  fromEmail: string
  originalSubject: string
  originalStatus: string
  originalReceivedLabel: string
  reArrivedLabel: string
  pdfUrl: string | null
}

const statusLabel: Record<string, string> = {
  new_sender: 'Novo remetente',
  pending: 'Pendente',
  approved: 'Aceito',
  paid_by_gc: 'Pago pelo GC',
  paid_to_client: 'Pago ao cliente',
  locked: 'Travado',
  rejected: 'Rejeitado',
}

export function DuplicatesView({ rows }: { rows: DuplicateRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onDismiss(row: DuplicateRow) {
    if (
      !confirm(
        `Descartar reenvio v${row.versionNumber} de ${row.fromEmail}? A invoice original continua intacta.`,
      )
    )
      return
    startTransition(async () => {
      await dismissVersionAction(row.versionId)
      router.refresh()
    })
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center font-mono text-[12px] text-ink-3">
        Nenhuma duplicata pendente.
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 px-3 py-2.5 bg-red-soft border border-red font-mono text-[12px]">
        <strong>Atenção:</strong> estes são emails reenviados com PDF idêntico ao
        de uma invoice já registrada. Clique em <strong>Ver PDF</strong> pra
        conferir se é só reenvio, e <strong>Descartar</strong> pra limpar.
      </div>
      {rows.map((row) => (
        <div
          key={row.versionId}
          className="grid gap-4 py-4 border-b border-line items-center"
          style={{ gridTemplateColumns: '80px 1fr auto auto auto' }}
        >
          <div className="font-mono text-[11px] font-medium text-ink-2 uppercase tracking-[0.05em]">
            v{row.versionNumber}
            <br />
            <span className="text-ink-3">{row.reArrivedLabel}</span>
          </div>
          <div>
            <div className="font-bold text-[14px]">{row.fromName}</div>
            <div className="font-mono text-[11px] text-ink-3 mt-0.5">{row.fromEmail}</div>
            <div className="font-mono text-[12px] text-ink-2 mt-[3px]">
              Original: <strong>{row.originalSubject}</strong> ·{' '}
              <span className="text-ink-3">{row.originalReceivedLabel}</span> ·{' '}
              <span className="text-ink-3">
                {statusLabel[row.originalStatus] ?? row.originalStatus}
              </span>
            </div>
          </div>
          <div className="font-mono text-[11px] text-ink-3 uppercase tracking-wide">
            mesmo PDF
          </div>
          {row.pdfUrl ? (
            <a
              href={row.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-ink-2 hover:text-ink underline"
            >
              Ver PDF
            </a>
          ) : (
            <span className="font-mono text-[11px] text-ink-3">—</span>
          )}
          <button
            type="button"
            onClick={() => onDismiss(row)}
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
