'use client'

import { HelperVoice } from '@/components/shared/helper-voice'
import { Modal } from '@/components/shared/modal'
import { useState } from 'react'

export function AdvanceModal({
  open,
  clientName,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean
  clientName: string
  pending: boolean
  onClose: () => void
  onConfirm: (amount: number, description: string) => void
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  function handleClose() {
    setAmount('')
    setDescription('')
    onClose()
  }

  function handleSubmit() {
    const n = Number(amount.replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) return
    onConfirm(n, description)
  }

  const parsed = Number(amount.replace(',', '.'))
  const valid = Number.isFinite(parsed) && parsed > 0

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Adiantamento · ${clientName}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid || pending}
            onClick={handleSubmit}
          >
            {pending ? 'Registrando…' : 'Registrar'}
          </button>
        </>
      }
    >
      <div>
        <label className="form-label" htmlFor="advance-amount">
          Valor entregue em cash
        </label>
        <input
          id="advance-amount"
          type="text"
          inputMode="decimal"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex: 300,00"
          className="form-input"
        />
      </div>
      <div className="mt-3">
        <label className="form-label" htmlFor="advance-desc">
          Observação <span className="text-ink-3 font-normal">(opcional)</span>
        </label>
        <input
          id="advance-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: adiantamento semana 17"
          className="form-input"
        />
      </div>
      <HelperVoice>
        Entregou cash antes do GC pagar? Registre aqui. Quando o invoice
        correspondente for quitado, o sistema desconta automaticamente.
      </HelperVoice>
    </Modal>
  )
}
