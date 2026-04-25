'use client'

import {
  addAdvanceAction,
  markPaidToClientAction,
  reconcileInvoiceAction,
} from '@/app/(dashboard)/statement/actions'
import { AdvanceModal } from '@/components/statement/advance-modal'
import { CashPayoutModal, type CashBreakdown } from '@/components/statement/cash-payout-modal'
import { ReconcileModal } from '@/components/statement/reconcile-modal'
import { SuccessModal } from '@/components/shared/success-modal'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export type MovementRow = {
  id: string
  /** ISO datetime — rendered "APR 18" + "09:23" small */
  entryDate: string
  /** createdAt for time small */
  createdAt: string
  /** Maps to .move-icon class: invoice | payment | advance | correction | reversal */
  icon: 'invoice' | 'payment' | 'advance' | 'correction' | 'reversal'
  /** Short label e.g. "Invoice received" */
  type: string
  /** Main description — can contain invoice ref */
  description: string
  /** Invoice number reference if clickable (opens PDF) */
  invoiceRef?: { number: string; pdfUrl: string | null } | null
  /** Smaller note below the description */
  note?: string
  /** Signed amount: negative = debit (red), positive = credit (green) */
  amount: number
  /** Running balance after this movement */
  runningBalance: number
  /** If an open invoice, the invoice id for reconciliation */
  openInvoiceId?: string | null
  /** Only present if row is a recordable invoice (needs payment) */
  expectedAmount?: number | null
}

export type LedgerDetailData = {
  person: {
    id: string
    displayName: string
    email: string
    feePercent: number
    companyName: string | null
    openInvoiceCount: number
    lastPaymentDate: string | null
  }
  balance: number
  movements: MovementRow[]
  pendingAdvancesTotal: number
}

const CAD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function formatSignedAmount(amount: number): { label: string; cls: string } {
  if (amount === 0) return { label: CAD.format(0), cls: 'empty' }
  const abs = Math.abs(amount)
  if (amount < 0) return { label: `− ${CAD.format(abs)}`, cls: 'debit' }
  return { label: `+ ${CAD.format(abs)}`, cls: 'credit' }
}

function formatRunningBalance(amount: number): { label: string; cls: string } {
  if (amount === 0) return { label: CAD.format(0), cls: 'zero' }
  const abs = Math.abs(amount)
  if (amount < 0) return { label: `− ${CAD.format(abs)}`, cls: 'negative' }
  return { label: `+ ${CAD.format(abs)}`, cls: '' }
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const month = d.toLocaleString('en', { month: 'short' }).toUpperCase()
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { date: `${month} ${day}`, time: `${hh}:${mm}` }
}

function iconLabel(icon: MovementRow['icon']): string {
  return icon === 'invoice'
    ? 'I'
    : icon === 'payment'
      ? 'P'
      : icon === 'advance'
        ? 'A'
        : icon === 'correction'
          ? 'C'
          : 'R'
}

export function LedgerDetailView({ data }: { data: LedgerDetailData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<
    | { kind: 'recon'; invoiceId: string; invoiceNumber: string; expected: number }
    | { kind: 'cash'; breakdown: CashBreakdown; invoiceId: string }
    | { kind: 'advance' }
    | { kind: 'success'; message: string }
    | { kind: 'error'; message: string }
    | null
  >(null)

  const firstOpenInvoice = data.movements.find(
    (m) => m.openInvoiceId && m.expectedAmount,
  )

  function startReconFor(invoiceId: string, invoiceNumber: string, expected: number) {
    setModal({ kind: 'recon', invoiceId, invoiceNumber, expected })
  }

  function confirmRecon(received: number) {
    if (modal?.kind !== 'recon') return
    const { invoiceId, invoiceNumber } = modal
    startTransition(async () => {
      const res = await reconcileInvoiceAction(invoiceId, received)
      if (res.error) {
        setModal({ kind: 'error', message: res.error })
        return
      }
      setModal({
        kind: 'cash',
        invoiceId,
        breakdown: {
          invoiceNumber,
          received,
          feePercent: data.person.feePercent,
          advance: data.pendingAdvancesTotal,
        },
      })
      router.refresh()
    })
  }

  function saveAdvance(amount: number, description: string) {
    startTransition(async () => {
      const res = await addAdvanceAction(data.person.id, amount, description || null)
      if (res.error) {
        setModal({ kind: 'error', message: res.error })
        return
      }
      setModal({ kind: 'success', message: 'Advance recorded' })
      setTimeout(() => setModal(null), 1400)
      router.refresh()
    })
  }

  function markPaid() {
    if (modal?.kind !== 'cash') return
    const { invoiceId } = modal
    startTransition(async () => {
      const res = await markPaidToClientAction(invoiceId)
      if (res.error) {
        setModal({ kind: 'error', message: res.error })
        return
      }
      setModal({ kind: 'success', message: 'Settled' })
      setTimeout(() => setModal(null), 1400)
      router.refresh()
    })
  }

  const balance = formatRunningBalance(data.balance)

  return (
    <>
      <a className="back-link" href="/ledgers">
        ← Back to ledgers
      </a>

      <div className="ledger-header">
        <div className="ledger-header-left">
          <div className="ledger-person-name">{data.person.displayName}</div>
          <div className="ledger-person-email">{data.person.email}</div>
          <div className="ledger-person-meta">
            {data.person.companyName && (
              <div className="ledger-meta-item">
                <span className="label">Company</span>
                <span className="value">{data.person.companyName}</span>
              </div>
            )}
            <div className="ledger-meta-item">
              <span className="label">Default fee</span>
              <span className="value">{data.person.feePercent}%</span>
            </div>
            {data.person.lastPaymentDate && (
              <div className="ledger-meta-item">
                <span className="label">Last payment</span>
                <span className="value">{data.person.lastPaymentDate}</span>
              </div>
            )}
            <div className="ledger-meta-item">
              <span className="label">Open invoices</span>
              <span className="value">{data.person.openInvoiceCount}</span>
            </div>
          </div>
        </div>
        <div className="ledger-header-right">
          <div className="balance-display">
            <div className="balance-label">
              {data.balance < 0 ? 'Balance owed' : data.balance > 0 ? 'Credit' : 'Balance'}
            </div>
            <div className={['balance-amount', balance.cls].join(' ')}>
              <span className="currency">$</span>
              {CAD.format(Math.abs(data.balance)).replace('$', '')}
            </div>
          </div>
        </div>
      </div>

      <div className="ledger-actions">
        <button
          className="btn primary"
          disabled={!firstOpenInvoice}
          onClick={() =>
            firstOpenInvoice &&
            startReconFor(
              firstOpenInvoice.openInvoiceId!,
              firstOpenInvoice.invoiceRef?.number ?? 'Invoice',
              firstOpenInvoice.expectedAmount!,
            )
          }
          title={firstOpenInvoice ? undefined : 'No open invoices to reconcile'}
        >
          Record payment
        </button>
        <button
          className="btn"
          onClick={() => setModal({ kind: 'advance' })}
          title="Record a cash advance to this client before GC pays"
        >
          + Record advance
        </button>
        <a
          className="btn ghost"
          href={`/clients/${data.person.id}/edit`}
          style={{ textDecoration: 'none' }}
        >
          Edit person
        </a>
      </div>

      <div className="ledger-table-head">
        <div>Date</div>
        <div>Movement</div>
        <div className="col-amount">Debit / Credit</div>
        <div className="col-amount">Running balance</div>
        <div />
      </div>

      {data.movements.length === 0 && (
        <div className="ledger-row">
          <div className="col-date">—</div>
          <div className="col-movement">
            <div className="move-details">
              <div className="move-type">No movements yet</div>
            </div>
          </div>
          <div />
          <div />
          <div />
        </div>
      )}

      {data.movements.map((m) => {
        const amt = formatSignedAmount(m.amount)
        const run = formatRunningBalance(m.runningBalance)
        const clickable =
          !!m.openInvoiceId && !!m.expectedAmount && m.icon === 'invoice'
        const date = formatDate(m.entryDate)
        const time = formatDate(m.createdAt).time
        return (
          <div
            key={m.id}
            className={['ledger-row', clickable ? 'clickable' : ''].join(' ')}
            onClick={
              clickable
                ? () =>
                    startReconFor(
                      m.openInvoiceId!,
                      m.invoiceRef?.number ?? 'Invoice',
                      m.expectedAmount!,
                    )
                : undefined
            }
          >
            <div className="col-date">
              {date.date}
              <small>{time}</small>
            </div>
            <div className="col-movement">
              <div className={['move-icon', m.icon].join(' ')}>
                {iconLabel(m.icon)}
              </div>
              <div className="move-details">
                <div className="move-type">{m.type}</div>
                <div className="move-desc">
                  {m.invoiceRef ? (
                    m.invoiceRef.pdfUrl ? (
                      <a
                        className="ref"
                        href={m.invoiceRef.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {m.invoiceRef.number}
                      </a>
                    ) : (
                      <span className="ref">{m.invoiceRef.number}</span>
                    )
                  ) : null}
                  {m.invoiceRef && ' · '}
                  {m.description}
                </div>
                {m.note && <div className="move-note">{m.note}</div>}
              </div>
            </div>
            <div className={['col-amount', amt.cls].join(' ')}>{amt.label}</div>
            <div className={['col-running', run.cls].join(' ')}>{run.label}</div>
            <div className="col-action">
              {clickable ? 'Record payment →' : ''}
            </div>
          </div>
        )
      })}

      <div className="ledger-footer-actions">
        <div className="ledger-audit">
          Append-only · {data.movements.length}{' '}
          {data.movements.length === 1 ? 'movement' : 'movements'} · nothing deleted
        </div>
        <div className="balance-display" style={{ alignItems: 'flex-end' }}>
          <div className="balance-label">Current balance</div>
          <div className={['balance-amount', balance.cls].join(' ')}>
            <span className="currency">$</span>
            {CAD.format(Math.abs(data.balance)).replace('$', '')}
          </div>
        </div>
      </div>

      <ReconcileModal
        open={modal?.kind === 'recon'}
        invoiceNumber={modal?.kind === 'recon' ? modal.invoiceNumber : ''}
        expected={modal?.kind === 'recon' ? modal.expected : 0}
        onClose={() => setModal(null)}
        onConfirm={confirmRecon}
      />
      <CashPayoutModal
        open={modal?.kind === 'cash'}
        breakdown={modal?.kind === 'cash' ? modal.breakdown : null}
        onClose={() => setModal(null)}
        onConfirm={markPaid}
      />
      <AdvanceModal
        open={modal?.kind === 'advance'}
        clientName={data.person.displayName}
        pending={isPending}
        onClose={() => setModal(null)}
        onConfirm={saveAdvance}
      />
      <SuccessModal
        open={modal?.kind === 'success'}
        onClose={() => setModal(null)}
        message={modal?.kind === 'success' ? modal.message : ''}
      />
      {modal?.kind === 'error' && (
        <div className="toast show">
          <span>{modal.message}</span>
          <button
            type="button"
            onClick={() => setModal(null)}
            className="toast-undo"
          >
            Dismiss
          </button>
        </div>
      )}

      {isPending && (
        <div
          className="toast show"
          style={{ bottom: 70, background: 'var(--color-paper)', color: 'var(--color-ink-3)', border: '1px solid var(--color-line)', boxShadow: 'none' }}
        >
          <span>Processing…</span>
        </div>
      )}
    </>
  )
}
