'use client'

import {
  linkInvoiceToClientAction,
  rejectSenderAction,
} from '@/app/(dashboard)/inbox/actions'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { SuccessModal } from '@/components/shared/success-modal'
import { AddClientModal, type AddClientCompany, type AddClientInvoice } from './add-client-modal'
import { InboxRow } from './inbox-row'
import {
  LinkClientModal,
  type LinkableClient,
} from './link-client-modal'
import { NewSenderCard } from './new-sender-card'
import { PdfModal } from './pdf-modal'
import { SenderDecisionModal } from './sender-decision-modal'
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
  source: InvoiceSource
}

export type InvoiceSource = 'xmp' | 'subject' | 'manual_required' | 'manual'

type ModalState =
  | { kind: 'decision'; sender: NewSenderData }
  | { kind: 'add'; invoice: AddClientInvoice }
  | { kind: 'link'; sender: NewSenderData }
  | { kind: 'pdf'; title: string; pdfUrl: string | null }
  | { kind: 'success'; message: string }
  | null

export function InboxView({
  newSenders,
  rows,
  rowInvoiceIds,
  rowPdfUrls,
  rowSenders,
  rowSources,
  companies,
  existingClients,
  defaultFeePercent,
}: {
  newSenders: NewSenderData[]
  rows: InboxRowType[]
  rowInvoiceIds: Record<string, string | null>
  rowPdfUrls: Record<string, string | null>
  rowSenders: Record<string, string>
  rowSources: Record<string, InvoiceSource>
  companies: AddClientCompany[]
  existingClients: LinkableClient[]
  defaultFeePercent: number
}) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>(null)
  const [isPending, startTransition] = useTransition()

  function openDecision(sender: NewSenderData) {
    setModal({ kind: 'decision', sender })
  }

  function chooseAddNew(sender: NewSenderData) {
    setModal({
      kind: 'add',
      invoice: {
        id: sender.invoiceId,
        from_name: sender.fromName,
        from_email: sender.fromEmail,
      },
    })
  }

  function chooseLink(sender: NewSenderData) {
    setModal({ kind: 'link', sender })
  }

  function chooseBlock(sender: NewSenderData) {
    if (
      !confirm(
        `Bloquear ${sender.fromEmail}? Esse invoice vai para rejected e futuros emails desse remetente serão ignorados.`,
      )
    )
      return
    startTransition(async () => {
      await rejectSenderAction(sender.invoiceId, true)
      setModal(null)
      router.refresh()
    })
  }

  function confirmLink(clientId: string) {
    if (modal?.kind !== 'link') return
    const invoiceId = modal.sender.invoiceId
    startTransition(async () => {
      const result = await linkInvoiceToClientAction(invoiceId, clientId)
      if (result.error) {
        alert(result.error)
        return
      }
      setModal({ kind: 'success', message: 'Vinculado ao cliente' })
      setTimeout(() => setModal(null), 1200)
      router.refresh()
    })
  }

  // useCallback: reference-stable so AddClientModal's effect doesn't loop
  const onAddSuccess = useCallback(() => {
    setModal({ kind: 'success', message: 'Cliente adicionado' })
    setTimeout(() => setModal(null), 1200)
    router.refresh()
  }, [router])

  function onRowClick(rowId: string) {
    const clientId = rowInvoiceIds[rowId]
    if (clientId) router.push(`/statement?clientId=${clientId}`)
  }

  function openPdf(title: string, pdfUrl: string | null) {
    setModal({ kind: 'pdf', title, pdfUrl })
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
          source={sender.source}
          onViewPdf={
            sender.pdfUrl
              ? () =>
                  openPdf(
                    sender.invoiceNumber ?? sender.fromName ?? 'invoice',
                    sender.pdfUrl,
                  )
              : undefined
          }
          onReject={() => chooseBlock(sender)}
          onDecide={() => openDecision(sender)}
        />
      ))}

      {rows.length > 0 && (
        <>
          <div className="section-label">Emails recebidos · últimos 7 dias</div>
          {rows.map((row) => (
            <InboxRow
              key={row.id}
              row={row}
              pdfUrl={rowPdfUrls[row.id] ?? null}
              source={rowSources[row.id]}
              onViewPdf={
                rowPdfUrls[row.id]
                  ? () => openPdf(rowSenders[row.id] ?? 'invoice', rowPdfUrls[row.id])
                  : undefined
              }
              onClick={row.status === 'accepted' ? () => onRowClick(row.id) : undefined}
            />
          ))}
        </>
      )}

      <SenderDecisionModal
        open={modal?.kind === 'decision'}
        fromName={modal?.kind === 'decision' ? modal.sender.fromName : null}
        fromEmail={modal?.kind === 'decision' ? modal.sender.fromEmail : ''}
        onClose={() => setModal(null)}
        onLink={() => modal?.kind === 'decision' && chooseLink(modal.sender)}
        onAddNew={() => modal?.kind === 'decision' && chooseAddNew(modal.sender)}
        onBlock={() => modal?.kind === 'decision' && chooseBlock(modal.sender)}
      />

      <LinkClientModal
        open={modal?.kind === 'link'}
        clients={existingClients}
        pending={isPending}
        onClose={() => setModal(null)}
        onConfirm={confirmLink}
      />

      <AddClientModal
        open={modal?.kind === 'add'}
        invoice={modal?.kind === 'add' ? modal.invoice : null}
        companies={companies}
        defaultFeePercent={defaultFeePercent}
        onClose={() => setModal(null)}
        onSuccess={onAddSuccess}
      />

      <PdfModal
        open={modal?.kind === 'pdf'}
        title={modal?.kind === 'pdf' ? modal.title : ''}
        pdfUrl={modal?.kind === 'pdf' ? modal.pdfUrl : null}
        onClose={() => setModal(null)}
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
