'use client'

import { usePathname } from 'next/navigation'

const LABELS: Record<string, string> = {
  inbox: 'Inbox',
  ledgers: 'Ledgers',
  closing: 'Closing',
  settings: 'Settings',
  // Legacy routes still served:
  statement: 'Statement',
  clients: 'Clients',
  export: 'Export',
}

export function Breadcrumb() {
  const pathname = usePathname()
  const segment = pathname.split('/').filter(Boolean)[0] ?? ''
  const pageLabel = LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)

  return (
    <div className="breadcrumb">
      Ops · <strong>{pageLabel}</strong>
    </div>
  )
}
