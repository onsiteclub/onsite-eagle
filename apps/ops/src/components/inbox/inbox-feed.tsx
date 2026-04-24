'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { PdfModal } from './pdf-modal'
import {
  StateLabel,
  stateActionLabel,
  stateRowModifier,
  type InboxState,
} from './state-label'

// =============================================================================
// Inbox feed — flat chronological list with single search and inline labels.
// Mirrors apps/ops/mockup-v4.html#inbox-list exactly.
// =============================================================================

export type InboxMessage = {
  id: string
  receivedAt: string // ISO
  dateLabel: string // "APR 22"
  timeLabel: string // "10:42"
  fromName: string
  fromEmail: string
  subject: string
  company: string | null
  invoiceNumber: string | null
  amount: number | null
  state: InboxState
  parentMessageId: string | null
  invoiceId: string | null
  clientId: string | null
  pdfUrl: string | null
  searchBlob: string
}

type ModalState =
  | { kind: 'pdf'; title: string; pdfUrl: string | null }
  | null

function formatAmount(n: number | null): { currency: string; value: string } | null {
  if (n === null) return null
  const formatted = new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
  return { currency: '$', value: formatted }
}

export function InboxFeed({ messages }: { messages: InboxMessage[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(null)

  // Build parent→children index. Messages without parent are parents.
  // Replies appear nested under their parent, regardless of own timestamp.
  const { parents, childrenByParent, replyCountByParent } = useMemo(() => {
    const parents: InboxMessage[] = []
    const childrenByParent = new Map<string, InboxMessage[]>()
    const replyCountByParent = new Map<string, number>()

    for (const m of messages) {
      if (m.parentMessageId) {
        const arr = childrenByParent.get(m.parentMessageId) ?? []
        arr.push(m)
        childrenByParent.set(m.parentMessageId, arr)
        replyCountByParent.set(
          m.parentMessageId,
          (replyCountByParent.get(m.parentMessageId) ?? 0) + 1,
        )
      } else {
        parents.push(m)
      }
    }

    // Order children chronologically within each thread
    for (const arr of childrenByParent.values()) {
      arr.sort(
        (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime(),
      )
    }

    // Parents already come newest-first from the server
    return { parents, childrenByParent, replyCountByParent }
  }, [messages])

  const q = query.trim().toLowerCase()
  const matches = (m: InboxMessage) =>
    q === '' || m.searchBlob.includes(q)

  // Visible parents: parent matches OR any of its children matches
  const visibleParents = useMemo(() => {
    if (q === '') return parents
    return parents.filter((p) => {
      if (matches(p)) return true
      const kids = childrenByParent.get(p.id) ?? []
      return kids.some(matches)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parents, childrenByParent, q])

  function onRowAction(m: InboxMessage) {
    if (m.state === 'conflict') {
      // Phase 2: version compare modal; for now, just open PDF.
      if (m.pdfUrl) setModal({ kind: 'pdf', title: m.invoiceNumber ?? m.fromName, pdfUrl: m.pdfUrl })
      return
    }
    if (m.state === 'new_sender' || m.state === 'external_pdf') {
      if (m.pdfUrl) setModal({ kind: 'pdf', title: m.invoiceNumber ?? m.fromName, pdfUrl: m.pdfUrl })
      return
    }
    // timekeeper, message, reply → open ledger of the client (when known)
    if (m.clientId) router.push(`/statement?clientId=${m.clientId}`)
    else if (m.pdfUrl) setModal({ kind: 'pdf', title: m.invoiceNumber ?? m.fromName, pdfUrl: m.pdfUrl })
  }

  return (
    <>
      <div className="inbox-search-wrap">
        <div className={`inbox-search ${query ? 'has-value' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search name, email, company, invoice number, date..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="inbox-search-clear"
            onClick={() => setQuery('')}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="inbox-list">
        {visibleParents.length === 0 ? (
          <div className="inbox-empty">
            {q === '' ? 'Nothing in the inbox yet.' : 'No messages match your search.'}
          </div>
        ) : (
          visibleParents.map((parent) => {
            const children = childrenByParent.get(parent.id) ?? []
            const replyCount = replyCountByParent.get(parent.id) ?? 0
            return (
              <div key={parent.id}>
                <ParentRow
                  message={parent}
                  replyCount={replyCount}
                  onAction={() => onRowAction(parent)}
                />
                {children.map((child) => (
                  <ChildRow
                    key={child.id}
                    message={child}
                    onAction={() => onRowAction(child)}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>

      <PdfModal
        open={modal?.kind === 'pdf'}
        title={modal?.kind === 'pdf' ? modal.title : ''}
        pdfUrl={modal?.kind === 'pdf' ? modal.pdfUrl : null}
        onClose={() => setModal(null)}
      />
    </>
  )
}

function ParentRow({
  message,
  replyCount,
  onAction,
}: {
  message: InboxMessage
  replyCount: number
  onAction: () => void
}) {
  const modifier = stateRowModifier(message.state)
  const amount = formatAmount(message.amount)
  return (
    <div className={`inbox-row ${modifier}`.trim()}>
      <div className="inbox-date">
        {message.dateLabel}
        <span className="inbox-date-time">{message.timeLabel}</span>
      </div>
      <div className="inbox-main">
        <StateLabel state={message.state} replyCount={replyCount} />
        <div className="inbox-from">
          {message.fromName}
          <span className="inbox-from-email">{message.fromEmail}</span>
        </div>
        <div className="inbox-subject">
          {message.invoiceNumber ?? message.subject}
          {message.company && <span className="inbox-company">{message.company}</span>}
        </div>
      </div>
      <div className="inbox-value">
        {amount ? (
          <>
            <span className="currency">{amount.currency}</span>
            {amount.value}
          </>
        ) : (
          <span style={{ color: 'var(--color-ink-4)', fontSize: 14 }}>—</span>
        )}
      </div>
      <button type="button" className="inbox-action" onClick={onAction}>
        {stateActionLabel(message.state)}
      </button>
    </div>
  )
}

function ChildRow({
  message,
  onAction,
}: {
  message: InboxMessage
  onAction: () => void
}) {
  return (
    <div className="inbox-thread-child">
      <div className="inbox-date">
        {message.dateLabel}
        <span className="inbox-date-time">{message.timeLabel}</span>
      </div>
      <div className="inbox-main">
        <StateLabel state={message.state} />
        <div className="inbox-from">
          {message.fromName}
          <span className="inbox-from-email">{message.fromEmail}</span>
        </div>
        <div className="inbox-subject">{message.subject}</div>
      </div>
      <div className="inbox-value" style={{ color: 'var(--color-ink-4)', fontSize: 14 }}>
        —
      </div>
      <button type="button" className="inbox-action" onClick={onAction}>
        {stateActionLabel(message.state)}
      </button>
    </div>
  )
}
