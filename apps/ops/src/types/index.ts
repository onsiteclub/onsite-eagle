export type InvoiceStatus =
  | 'pending'
  | 'new_sender'
  | 'rejected'
  | 'approved'
  | 'paid_by_gc'
  | 'paid_to_client'
  | 'locked'

export type InboxStatus = 'pending' | 'accepted' | 'unknown'

export interface NewSender {
  fromName: string
  fromEmail: string
  invoiceNumber: string
  gc: string
  site: string
  amount: number
  receivedAgo: string
}

export interface InboxRow {
  id: string
  dateLabel: string
  timeLabel: string
  fromName: string
  fromEmail: string
  subject: string
  amount: number | null
  status: InboxStatus
  statusLabel: string
}

// Matches ops_ledger_entries.entry_type CHECK constraint.
// Tipos de UI (labelKind) vivem em LedgerRow — não confundir.
export type LedgerEntryType =
  | 'invoice_received'
  | 'gc_payment_received'
  | 'advance_paid'
  | 'cash_paid_full'
  | 'operator_fee'
  | 'adjustment'

export interface LedgerRow {
  id: string
  dateLabel: string
  label: string
  labelKind: 'invoice' | 'text'
  amount: number
  balanceAfter: number
  paid: boolean
  alerted: boolean
  expected?: number
}

export interface ClientSummary {
  id: string
  initials: string
  displayName: string
  email: string
  feePercent: number
  balanceLabel: string
  balanceTone: 'accepted' | 'unknown'
}
