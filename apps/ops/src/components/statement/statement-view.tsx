'use client'

import {
  addAdvanceAction,
  markPaidToClientAction,
  reconcileInvoiceAction,
} from '@/app/(dashboard)/statement/actions'
import { SuccessModal } from '@/components/shared/success-modal'
import { AdvanceModal } from './advance-modal'
import { CashPayoutModal, type CashBreakdown } from './cash-payout-modal'
import { LedgerRow } from './ledger-row'
import { ReconcileModal } from './reconcile-modal'
import { formatCurrency } from '@/lib/format'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { LedgerRow as LedgerRowType } from '@/types'

export type ClientHeader = {
  id: string
  display_name: string
  email: string
  fee_percent: number
}

export function StatementView({
  client,
  balance,
  openRows,
  closedRows,
  rowInvoiceId,
  rowPdfUrls,
  pendingAdvancesTotal,
}: {
  client: ClientHeader
  balance: number
  openRows: LedgerRowType[]
  closedRows: LedgerRowType[]
  rowInvoiceId: Record<string, string | null>
  rowPdfUrls: Record<string, string | null>
  pendingAdvancesTotal: number
}) {
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

  function startRecon(row: LedgerRowType) {
    if (!row.expected) return
    const invoiceId = rowInvoiceId[row.id]
    if (!invoiceId) return
    setModal({
      kind: 'recon',
      invoiceId,
      invoiceNumber: row.label,
      expected: row.expected,
    })
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
          feePercent: client.fee_percent,
          advance: pendingAdvancesTotal,
        },
      })
      router.refresh()
    })
  }

  function saveAdvance(amount: number, description: string) {
    startTransition(async () => {
      const res = await addAdvanceAction(client.id, amount, description || null)
      if (res.error) {
        setModal({ kind: 'error', message: res.error })
        return
      }
      setModal({ kind: 'success', message: 'Adiantamento registrado' })
      setTimeout(() => setModal(null), 1200)
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
      setModal({ kind: 'success', message: 'Quitado' })
      setTimeout(() => setModal(null), 1200)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center justify-between pb-5 border-b border-line">
        <div>
          <div
            className="font-black text-[30px] uppercase"
            style={{ letterSpacing: '-0.03em', lineHeight: 1 }}
          >
            {client.display_name}
          </div>
          <div className="font-mono text-[11px] text-ink-3 mt-1.5">{client.email}</div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setModal({ kind: 'advance' })}
            title="Registrar adiantamento em cash ao cliente"
          >
            + Adiantamento
          </button>
          <div
            className={[
              'font-black text-[36px] text-right',
              balance < 0 ? 'text-red' : 'text-green',
            ].join(' ')}
            style={{ letterSpacing: '-0.03em', lineHeight: 1 }}
          >
            <span className="text-[14px] align-top mr-[3px] text-ink-3">$</span>
            {formatCurrency(Math.abs(balance)).replace('$', '')}
          </div>
        </div>
      </div>

      {openRows.length > 0 && (
        <>
          <div className="section-label">Em aberto</div>
          {openRows.map((row) => (
            <LedgerRow
              key={row.id}
              row={row}
              pdfUrl={rowPdfUrls[row.id] ?? null}
              onCheckClick={row.expected ? () => startRecon(row) : undefined}
            />
          ))}
        </>
      )}

      {closedRows.length > 0 && (
        <>
          <div className="section-label">Quitados</div>
          {closedRows.map((row) => (
            <LedgerRow
              key={row.id}
              row={row}
              pdfUrl={rowPdfUrls[row.id] ?? null}
            />
          ))}
        </>
      )}

      {openRows.length === 0 && closedRows.length === 0 && (
        <div className="py-10 text-center font-mono text-[12px] text-ink-3">
          Nenhum lançamento ainda pra este cliente.
        </div>
      )}

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
        clientName={client.display_name}
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
        <div className="fixed bottom-5 right-5 bg-red text-paper px-4 py-3 font-mono text-[12px] max-w-[400px]">
          {modal.message}
          <button
            type="button"
            onClick={() => setModal(null)}
            className="ml-3 underline"
          >
            ok
          </button>
        </div>
      )}

      {isPending && (
        <div className="fixed bottom-5 left-5 font-mono text-[11px] text-ink-3 bg-paper border border-line px-3 py-1.5">
          Processando…
        </div>
      )}
    </>
  )
}
