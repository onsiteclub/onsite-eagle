'use client'

import { HelperVoice } from '@/components/shared/helper-voice'
import { Modal } from '@/components/shared/modal'
import { formatCurrency, formatCurrencyShort, parseCurrencyInput } from '@/lib/format'
import { useEffect, useState } from 'react'

export function ReconcileModal({
  open,
  invoiceNumber,
  expected,
  onClose,
  onConfirm,
}: {
  open: boolean
  invoiceNumber: string
  expected: number
  onClose: () => void
  onConfirm: (received: number) => void
}) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setValue('')
  }, [open])

  const received = parseCurrencyInput(value)
  const diff = received - expected
  const hasValue = received > 0
  const diverges = hasValue && Math.abs(diff) > 0.5

  const confirmClass = diverges ? 'btn btn-danger' : 'btn btn-primary'
  const confirmLabel = diverges ? 'Usar mesmo assim' : 'Confirmar'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoiceNumber}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={() => onConfirm(hasValue ? received : expected)}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex justify-between items-baseline py-3 border-b border-line">
        <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">Invoice</div>
        <div className="font-extrabold text-[28px]" style={{ letterSpacing: '-0.02em' }}>
          {formatCurrencyShort(expected)}
        </div>
      </div>
      <div className="flex justify-between items-baseline py-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">Recebido</div>
        <div className="relative w-[160px]">
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[14px] text-ink-3 font-semibold pointer-events-none"
          >
            $
          </span>
          <input
            autoFocus
            type="text"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={[
              'w-full pl-[26px] pr-2.5 py-2.5 border-2 border-ink font-sans text-[18px] font-extrabold text-right outline-none',
              'bg-yellow-soft focus:bg-yellow',
            ].join(' ')}
            style={{ letterSpacing: '-0.01em' }}
          />
        </div>
      </div>
      {diverges && (
        <div
          className="mt-3 px-3.5 py-2.5 bg-red-soft font-mono text-[12px] text-red font-semibold"
          style={{ borderLeft: '3px solid #DC2626' }}
        >
          {diff > 0 ? '+ ' : '− '}
          {formatCurrency(Math.abs(diff)).replace('$', '$')} · NÃO CONFERE
        </div>
      )}
      <HelperVoice>
        <strong className="text-ink font-bold">Atenção:</strong> confirme o valor do cheque/depósito
        no banco. Se divergir, ligue pro cliente antes de pagar cash.
      </HelperVoice>
    </Modal>
  )
}
