'use client'

import { HelperVoice } from '@/components/shared/helper-voice'
import { Modal } from '@/components/shared/modal'
import { formatCurrency } from '@/lib/format'

export interface CashBreakdown {
  invoiceNumber: string
  received: number
  feePercent: number
  advance: number
}

export function CashPayoutModal({
  open,
  breakdown,
  onClose,
  onConfirm,
}: {
  open: boolean
  breakdown: CashBreakdown | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!breakdown) {
    return (
      <Modal open={open} onClose={onClose} title="Pagar cash">
        <div />
      </Modal>
    )
  }

  const fee = breakdown.received * (breakdown.feePercent / 100)
  const total = breakdown.received - fee - breakdown.advance

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pagar cash · ${breakdown.invoiceNumber}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Depois
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            Paguei · Marcar quitado
          </button>
        </>
      }
    >
      <div className="flex justify-between py-2 font-mono text-[13px] text-ink-2">
        <span>Recebido</span>
        <strong className="text-ink">{formatCurrency(breakdown.received)}</strong>
      </div>
      <div className="flex justify-between py-2 font-mono text-[13px] text-ink-2">
        <span>− Operador {breakdown.feePercent}%</span>
        <strong className="text-ink">− {formatCurrency(fee)}</strong>
      </div>
      <div className="flex justify-between py-2 font-mono text-[13px] text-ink-2">
        <span>− Adiantamento</span>
        <strong className="text-ink">
          {breakdown.advance > 0 ? `− ${formatCurrency(breakdown.advance)}` : '$0,00'}
        </strong>
      </div>
      <div
        className="flex justify-between pt-3.5 mt-2 font-black text-[22px] text-ink border-t-2 border-ink"
        style={{ letterSpacing: '-0.02em' }}
      >
        <span>Cash ao cliente</span>
        <strong>{formatCurrency(total)}</strong>
      </div>
      <HelperVoice>
        Encontre o cliente pessoalmente, <strong className="text-ink font-bold">mostre esse cálculo</strong>,
        entregue o cash. O pagamento fica registrado aqui só quando você confirmar.
      </HelperVoice>
    </Modal>
  )
}
