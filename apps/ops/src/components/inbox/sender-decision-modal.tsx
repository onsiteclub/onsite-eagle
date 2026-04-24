'use client'

import { Modal } from '@/components/shared/modal'

export function SenderDecisionModal({
  open,
  fromName,
  fromEmail,
  onClose,
  onLink,
  onAddNew,
  onBlock,
}: {
  open: boolean
  fromName: string | null
  fromEmail: string
  onClose: () => void
  onLink: () => void
  onAddNew: () => void
  onBlock: () => void
}) {
  const name = fromName || fromEmail

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Novo remetente · ${name}`}
      maxWidth={480}
    >
      <div
        style={{ color: 'var(--color-ink-2)', fontSize: 13, marginBottom: 6 }}
      >
        <strong>{fromEmail}</strong>
      </div>
      <div style={{ color: 'var(--color-ink-3)', fontSize: 13 }}>
        Esse email nunca enviou invoice antes. O que fazer?
      </div>
      <div className="three-options">
        <button type="button" className="option-btn" onClick={onLink}>
          <strong>Vincular a pessoa existente</strong>
          <span>Cliente trocou de email ou usa apelido diferente</span>
        </button>
        <button type="button" className="option-btn" onClick={onAddNew}>
          <strong>Cadastrar como novo cliente</strong>
          <span>Criar novo extrato para {name}</span>
        </button>
        <button
          type="button"
          className="option-btn"
          style={{
            borderColor: 'var(--color-red)',
            color: 'var(--color-red)',
          }}
          onClick={onBlock}
        >
          <strong>Bloquear remetente</strong>
          <span>Spam, endereço errado ou não tem a ver com o trabalho</span>
        </button>
      </div>
    </Modal>
  )
}
