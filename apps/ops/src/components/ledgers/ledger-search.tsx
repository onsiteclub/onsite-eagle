'use client'

import { useMemo, useState } from 'react'

export type LedgerCardData = {
  id: string
  displayName: string
  email: string
  initials: string
  companyName: string | null
  lastActivity: string | null
  balance: number
  openInvoiceCount: number
  lastPaymentDate: string | null
}

type Props = {
  openClients: LedgerCardData[]
  settledClients: LedgerCardData[]
}

const CAD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function renderBalance(balance: number) {
  if (balance === 0) return { label: '$0.00', cls: 'zero' }
  const abs = Math.abs(balance)
  const sign = balance < 0 ? '− ' : '+ '
  return { label: `${sign}${CAD.format(abs)}`, cls: '' }
}

function LedgerCard({ c, settled }: { c: LedgerCardData; settled: boolean }) {
  const bal = renderBalance(c.balance)
  const pendencies =
    c.openInvoiceCount === 0
      ? 'No pending'
      : c.openInvoiceCount === 1
        ? '1 open invoice'
        : `${c.openInvoiceCount} open invoices`
  return (
    <a className="ledger-card" href={`/ledgers/${c.id}`}>
      <div className="ledger-avatar">{c.initials}</div>
      <div className="ledger-info">
        <div className="ledger-name">{c.displayName}</div>
        <div className="ledger-email">{c.email}</div>
        <div className="ledger-meta">
          {c.companyName && <span>{c.companyName}</span>}
          {c.lastActivity && (
            <span>
              {settled ? 'Settled on' : 'Last activity ·'} {c.lastActivity}
            </span>
          )}
        </div>
      </div>
      <div
        className={['ledger-pendencies', settled ? 'zero' : ''].join(' ')}
        style={{ visibility: settled && c.openInvoiceCount === 0 ? 'visible' : undefined }}
      >
        {pendencies}
      </div>
      <div className="ledger-status">
        <div className={['ledger-balance', bal.cls].join(' ')}>{bal.label}</div>
        <div className="ledger-balance-label">
          {settled && c.lastPaymentDate
            ? `Last payment · ${c.lastPaymentDate}`
            : 'Open balance'}
        </div>
      </div>
    </a>
  )
}

export function LedgersListView({ openClients, settledClients }: Props) {
  const [q, setQ] = useState('')

  const filter = (cs: LedgerCardData[]) => {
    if (!q.trim()) return cs
    const lower = q.toLowerCase().trim()
    return cs.filter(
      (c) =>
        c.displayName.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower) ||
        (c.companyName?.toLowerCase().includes(lower) ?? false),
    )
  }

  const open = useMemo(() => filter(openClients), [q, openClients])
  const settled = useMemo(() => filter(settledClients), [q, settledClients])
  const totalPeople = openClients.length + settledClients.length

  return (
    <>
      <h1 className="page-title">Ledgers</h1>
      <div className="page-subtitle">
        {totalPeople} {totalPeople === 1 ? 'person' : 'people'} ·{' '}
        {openClients.length} with open balance
      </div>

      <div className="search-wrap">
        <div className="search">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {open.length > 0 && (
        <>
          <div className="list-section-label">Open balance</div>
          <div className="ledger-list">
            {open.map((c) => (
              <LedgerCard key={c.id} c={c} settled={false} />
            ))}
          </div>
        </>
      )}

      {settled.length > 0 && (
        <>
          <div className="list-section-label">Settled</div>
          <div className="ledger-list">
            {settled.map((c) => (
              <LedgerCard key={c.id} c={c} settled={true} />
            ))}
          </div>
        </>
      )}

      {open.length === 0 && settled.length === 0 && totalPeople > 0 && (
        <div className="pdf-preview" style={{ marginTop: 32 }}>
          No match for &quot;{q}&quot;
        </div>
      )}

      {totalPeople === 0 && (
        <div className="pdf-preview" style={{ marginTop: 32 }}>
          No people yet. Invoices arriving via inbox will create ledgers here.
        </div>
      )}
    </>
  )
}
