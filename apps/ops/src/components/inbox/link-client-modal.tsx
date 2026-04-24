'use client'

import { Modal } from '@/components/shared/modal'
import { useMemo, useState } from 'react'

export type LinkableClient = {
  id: string
  displayName: string
  email: string
}

export function LinkClientModal({
  open,
  clients,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean
  clients: LinkableClient[]
  pending: boolean
  onClose: () => void
  onConfirm: (clientId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    )
  }, [clients, query])

  function handleClose() {
    setQuery('')
    setSelectedId(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Vincular a cliente existente"
      maxWidth={480}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedId || pending}
            onClick={() => selectedId && onConfirm(selectedId)}
          >
            {pending ? 'Vinculando…' : 'Vincular'}
          </button>
        </>
      }
    >
      <input
        type="search"
        placeholder="Buscar por nome ou email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-3 py-2 border border-line bg-paper font-mono text-[12px] mb-3"
        autoFocus
      />
      <div
        className="border border-line max-h-[320px] overflow-y-auto"
        role="listbox"
      >
        {filtered.length === 0 ? (
          <div className="px-3 py-4 font-mono text-[12px] text-ink-3 text-center">
            {clients.length === 0
              ? 'Nenhum cliente cadastrado ainda.'
              : 'Nenhum cliente corresponde à busca.'}
          </div>
        ) : (
          filtered.map((c) => {
            const isSel = c.id === selectedId
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => setSelectedId(c.id)}
                className={[
                  'w-full text-left px-3 py-2 border-b border-line last:border-b-0 cursor-pointer',
                  isSel ? 'bg-yellow-soft' : 'bg-paper hover:bg-paper-2',
                ].join(' ')}
              >
                <div className="font-bold text-[13px]">{c.displayName}</div>
                <div className="font-mono text-[11px] text-ink-3">{c.email}</div>
              </button>
            )
          })
        )}
      </div>
    </Modal>
  )
}
