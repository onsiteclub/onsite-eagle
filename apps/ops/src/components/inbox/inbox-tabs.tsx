import Link from 'next/link'

export type InboxView = 'active' | 'rejected' | 'unprocessed'

export function InboxTabs({
  current,
  activeCount,
  rejectedCount,
  unprocessedCount,
}: {
  current: InboxView
  activeCount: number
  rejectedCount: number
  unprocessedCount: number
}) {
  return (
    <div className="flex gap-1 mb-5 border-b border-line">
      <Tab href="/inbox" label="Ativos" count={activeCount} active={current === 'active'} />
      <Tab
        href="/inbox?view=rejected"
        label="Rejeitados"
        count={rejectedCount}
        active={current === 'rejected'}
      />
      <Tab
        href="/inbox?view=unprocessed"
        label="Sem PDF"
        count={unprocessedCount}
        active={current === 'unprocessed'}
      />
    </div>
  )
}

function Tab({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={[
        'px-3 py-2 font-mono text-[12px] uppercase tracking-wide border-b-2 -mb-px',
        active
          ? 'border-ink text-ink font-bold'
          : 'border-transparent text-ink-3 hover:text-ink',
      ].join(' ')}
    >
      {label}
      {count > 0 && (
        <span
          className={[
            'ml-2 inline-block px-1.5 py-0.5 text-[10px] font-mono',
            active ? 'bg-yellow text-ink' : 'bg-paper-2 text-ink-3',
          ].join(' ')}
        >
          {count}
        </span>
      )}
    </Link>
  )
}
