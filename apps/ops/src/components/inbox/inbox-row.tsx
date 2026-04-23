import { formatCurrencyShort } from '@/lib/format'
import type { InboxRow as InboxRowType } from '@/types'

const statusClass: Record<InboxRowType['status'], string> = {
  pending: 'bg-yellow-soft text-ink border border-yellow',
  accepted: 'bg-green-soft text-green border border-green',
  unknown: 'bg-paper-2 text-ink-2 border border-line',
}

export function InboxRow({
  row,
  pdfUrl,
  onClick,
}: {
  row: InboxRowType
  pdfUrl?: string | null
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="grid gap-4 py-4 border-b border-line items-center cursor-pointer transition-colors hover:bg-paper-2"
      style={{ gridTemplateColumns: '80px 1fr auto auto auto' }}
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
      <div
        className={[
          'font-mono text-[13px] font-semibold',
          row.amount === null ? 'text-ink-3' : 'text-ink',
        ].join(' ')}
      >
        {row.amount === null ? '—' : formatCurrencyShort(row.amount)}
      </div>
      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Abrir PDF"
          className="font-mono text-[11px] text-ink-2 hover:text-ink underline"
        >
          PDF
        </a>
      ) : (
        <span className="font-mono text-[11px] text-ink-3">—</span>
      )}
      <div
        className={[
          'font-mono text-[10px] px-2 py-[3px] uppercase tracking-[0.05em] font-semibold',
          statusClass[row.status],
        ].join(' ')}
      >
        {row.statusLabel}
      </div>
    </div>
  )
}
