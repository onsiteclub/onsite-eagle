import type { ReactNode } from 'react'

export type InboxState =
  | 'new_sender'
  | 'conflict'
  | 'timekeeper'
  | 'external_pdf'
  | 'message'
  | 'reply'

type Config = {
  klass: string
  icon: string
  text: string
}

const CONFIG: Record<InboxState, Config> = {
  new_sender: {
    klass: 'new-sender',
    icon: '⚠',
    text: 'NEW SENDER — not recognized',
  },
  conflict: {
    klass: 'conflict',
    icon: '⚡',
    text: 'CONFLICT — same invoice, new version',
  },
  timekeeper: {
    klass: 'normal',
    icon: '✓',
    text: 'TIMEKEEPER — data auto-filled',
  },
  external_pdf: {
    klass: 'external',
    icon: '📄',
    text: 'EXTERNAL PDF — manual entry',
  },
  message: {
    klass: 'external',
    icon: '✉',
    text: 'MESSAGE — no attachment',
  },
  reply: {
    klass: 'external',
    icon: '↩',
    text: 'REPLY — in thread',
  },
}

export function StateLabel({
  state,
  replyCount,
}: {
  state: InboxState
  replyCount?: number
}) {
  const cfg = CONFIG[state]
  return (
    <div className={`inbox-state-row ${cfg.klass}`}>
      <div className="inbox-state-icon">{cfg.icon}</div>
      <span>{cfg.text}</span>
      {replyCount && replyCount > 0 ? (
        <span className="thread-indicator">
          {replyCount} {replyCount === 1 ? 'REPLY' : 'REPLIES'}
        </span>
      ) : null}
    </div>
  )
}

export function stateRowModifier(state: InboxState): string {
  if (state === 'new_sender') return 'state-new-sender'
  if (state === 'conflict') return 'state-conflict'
  return ''
}

export function stateActionLabel(state: InboxState): string {
  switch (state) {
    case 'new_sender':
      return 'Review PDF'
    case 'conflict':
      return 'Compare versions'
    case 'timekeeper':
      return 'Open ledger'
    case 'external_pdf':
      return 'Review PDF'
    case 'message':
      return 'Open ledger'
    case 'reply':
      return 'Open'
  }
}

export function stateActionFallback(state: InboxState): ReactNode {
  return <span>{stateActionLabel(state)}</span>
}
