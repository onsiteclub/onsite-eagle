'use client'

import { HelperVoice } from '@/components/shared/helper-voice'
import { formatCurrencyShort } from '@/lib/format'
import type { NewSender } from '@/types'
import { SourceBadge } from './source-badge'
import type { InvoiceSource } from './inbox-view'

export function NewSenderCard({
  sender,
  pdfUrl,
  source,
  onViewPdf,
  onReject,
  onDecide,
}: {
  sender: NewSender
  pdfUrl?: string | null
  source: InvoiceSource
  onViewPdf?: () => void
  onReject: () => void
  onDecide: () => void
}) {
  const detailText = [
    `${sender.invoiceNumber}.pdf`,
    sender.gc,
    sender.site,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="border-2 border-ink bg-yellow-soft shadow-hard p-5 mb-5">
      <div className="flex justify-between items-start mb-3.5">
        <div className="font-black text-[14px] uppercase tracking-[-0.01em] flex items-center gap-2">
          <span className="text-[16px]">📬</span>
          Novo remetente
          <SourceBadge source={source} />
        </div>
        <div className="font-mono text-[11px] text-ink-3">{sender.receivedAgo}</div>
      </div>
      <div className="text-[14px] mb-3.5">
        <strong className="font-bold">{sender.fromName}</strong> enviou um invoice pela primeira vez.
        <div className="font-mono text-[12px] text-ink-2 mt-1">{sender.fromEmail}</div>
      </div>
      <div className="mt-3 px-3 py-2.5 bg-paper border border-line flex justify-between items-center font-mono text-[12px]">
        {onViewPdf ? (
          <button
            type="button"
            onClick={onViewPdf}
            className="underline text-ink hover:text-yellow truncate pr-3 bg-transparent border-0 text-left cursor-pointer"
          >
            {detailText}
          </button>
        ) : pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-ink hover:text-yellow truncate pr-3"
          >
            {detailText}
          </a>
        ) : (
          <span className="truncate pr-3">{detailText}</span>
        )}
        <span className="font-sans font-black text-[16px] shrink-0">
          {sender.amount > 0 ? formatCurrencyShort(sender.amount) : '—'}
        </span>
      </div>
      <div className="flex gap-2 mt-3.5">
        <button type="button" className="btn btn-ghost" onClick={onReject}>
          Recusar
        </button>
        <button type="button" className="btn btn-primary" onClick={onDecide}>
          Adicionar cliente
        </button>
      </div>
      <HelperVoice>
        <strong className="text-ink font-bold">Antes de adicionar:</strong> confirme por WhatsApp ou
        ligação. Combine a porcentagem, quais empresas ele pode usar. O app só registra — a
        combinação é verbal.
      </HelperVoice>
    </div>
  )
}
