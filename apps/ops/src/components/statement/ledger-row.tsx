'use client'

import { formatCurrency } from '@/lib/format'
import type { LedgerRow as LedgerRowType } from '@/types'

export function LedgerRow({
  row,
  pdfUrl,
  onCheckClick,
}: {
  row: LedgerRowType
  pdfUrl?: string | null
  onCheckClick?: () => void
}) {
  const locked = row.paid
  const debit = row.amount < 0
  const amountLabel = `${debit ? '− ' : '+ '}${formatCurrency(Math.abs(row.amount))}`

  return (
    <div
      className={[
        'grid gap-4 py-4 border-b border-line items-center transition-opacity',
        locked ? 'opacity-40' : '',
      ].join(' ')}
      style={{ gridTemplateColumns: '24px 70px 1fr auto 120px 110px' }}
    >
      <div
        onClick={!locked && onCheckClick ? onCheckClick : undefined}
        className={[
          'w-5 h-5 border-[1.5px] grid place-items-center',
          locked
            ? 'border-ink-3 bg-paper-2 cursor-default'
            : 'border-ink bg-paper cursor-pointer',
        ].join(' ')}
      >
        {locked && (
          <span className="text-ink-3 font-black text-[14px] leading-none">×</span>
        )}
      </div>
      <div className="font-mono text-[11px] font-medium text-ink-2 uppercase tracking-[0.05em]">
        {row.dateLabel}
      </div>
      <div
        className={[
          'text-[13px] font-semibold',
          row.labelKind === 'invoice'
            ? 'font-mono text-ink'
            : 'font-sans text-ink-2',
          locked ? 'line-through' : '',
        ].join(' ')}
      >
        {row.label}
        {row.alerted && (
          <span
            className="ml-1.5 align-[1px] text-[10px] bg-yellow text-ink font-semibold"
            style={{ padding: '1px 4px', borderRadius: 2 }}
          >
            ⚠
          </span>
        )}
      </div>
      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir PDF"
          className="font-mono text-[11px] text-ink-2 hover:text-ink underline whitespace-nowrap"
        >
          PDF
        </a>
      ) : (
        <span />
      )}
      <div
        className={[
          'font-mono text-[14px] font-bold text-right',
          debit ? 'text-red' : 'text-green',
          locked ? 'line-through' : '',
        ].join(' ')}
      >
        {amountLabel}
      </div>
      <div
        className={[
          'font-extrabold text-[14px] text-right text-ink',
          locked ? 'line-through' : '',
        ].join(' ')}
        style={{ letterSpacing: '-0.01em' }}
      >
        {formatCurrency(row.balanceAfter)}
      </div>
    </div>
  )
}
