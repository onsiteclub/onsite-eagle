'use client'

import { rejectSenderAction } from '@/app/(dashboard)/inbox/actions'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { SuccessModal } from '@/components/shared/success-modal'
import { AddClientModal, type AddClientCompany, type AddClientInvoice } from './add-client-modal'
import { InboxRow } from './inbox-row'
import { NewSenderCard } from './new-sender-card'
import type { InboxRow as InboxRowType } from '@/types'

export type NewSenderData = {
  invoiceId: string
  fromName: string | null
  fromEmail: string
  invoiceNumber: string | null
  gcName: string | null
  siteAddress: string | null
  amountGross: number
  receivedAgo: string
  pdfUrl: string | null
}

export function InboxView({
  newSenders,
  rows,
  rowInvoiceIds,
  companies,
  defaultFeePercent,
}: {
  newSenders: NewSenderData[]
  rows: InboxRowType[]
  rowInvoiceIds: Record<string, string | null>
  companies: AddClientCompany[]
  defaultFeePercent: number
}) {
  const router = useRouter()
  const [modal, setModal] = useState<
    | { kind: 'add'; invoice: AddClientInvoice }
    | { kind: 'success'; message: string }
    | null
  >(null)
  const [isPending, startTransition] = useTransition()

  function openAdd(sender: NewSenderData) {
    setModal({
      kind: 'add',
      invoice: {
        id: sender.invoiceId,
        from_name: sender.fromName,
        from_email: sender.fromEmail,
      },
    })
  }

  function reject(sender: NewSenderData) {
    if (
      !confirm(
        `Recusar ${sender.fromEmail}? O invoice vai para rejected e futuros emails desse remetente serão bloqueados.`,
      )
    )
      return
    startTransition(async () => {
      await rejectSenderAction(sender.invoiceId, true)
      router.refresh()
    })
  }

  // useCallback: referência estável evita loop do useEffect no AddClientModal.
  // Sem isso, cada router.refresh() re-cria onAddSuccess → re-dispara efeito
  // interno do modal → chama onAddSuccess de novo → loop.
  const onAddSuccess = useCallback(() => {
    setModal({ kind: 'success', message: 'Cliente adicionado' })
    setTimeout(() => setModal(null), 1200)
    router.refresh()
  }, [router])

  function onRowClick(rowId: string) {
    const clientId = rowInvoiceIds[rowId]
    if (clientId) router.push(`/statement?clientId=${clientId}`)
  }

  return (
    <>
      {newSenders.length === 0 && rows.length === 0 && (
        <div className="py-10 text-center font-mono text-[12px] text-ink-3">
          Nada na caixa de entrada. Quando chegar invoice por email, ela aparece
          aqui.
        </div>
      )}

      {newSenders.map((sender) => (
        <NewSenderCard
          key={sender.invoiceId}
          sender={{
            fromName: sender.fromName ?? sender.fromEmail,
            fromEmail: sender.fromEmail,
            invoiceNumber: sender.invoiceNumber ?? '—',
            gc: sender.gcName ?? '',
            site: sender.siteAddress ?? '',
            amount: sender.amountGross,
            receivedAgo: sender.receivedAgo,
          }}
          pdfUrl={sender.pdfUrl}
          onReject={() => reject(sender)}
          onAdd={() => openAdd(sender)}
        />
      ))}

      {rows.length > 0 && (
        <>
          <div className="section-label">Emails recebidos · últimos 7 dias</div>
          {rows.map((row) => (
            <InboxRow
              key={row.id}
              row={row}
              onClick={row.status === 'accepted' ? () => onRowClick(row.id) : undefined}
            />
          ))}
        </>
      )}

      <AddClientModal
        open={modal?.kind === 'add'}
        invoice={modal?.kind === 'add' ? modal.invoice : null}
        companies={companies}
        defaultFeePercent={defaultFeePercent}
        onClose={() => setModal(null)}
        onSuccess={onAddSuccess}
      />
      <SuccessModal
        open={modal?.kind === 'success'}
        onClose={() => setModal(null)}
        message={modal?.kind === 'success' ? modal.message : ''}
      />

      {isPending && (
        <div className="fixed bottom-5 right-5 font-mono text-[11px] text-ink-3 bg-paper border border-line px-3 py-1.5">
          Processando…
        </div>
      )}
    </>
  )
}
