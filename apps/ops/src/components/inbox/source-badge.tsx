'use client'

import type { InvoiceSource } from './inbox-view'

// Signals how the invoice data was obtained. Lets Paulo prioritize:
// XMP entries land pre-filled from Timekeeper; others need review.
export function SourceBadge({ source }: { source: InvoiceSource }) {
  switch (source) {
    case 'xmp':
      return (
        <span
          title="Dados extraídos do PDF do Timekeeper"
          className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 border border-green-600 text-green-700 bg-green-50"
        >
          ✓ verificado
        </span>
      )
    case 'subject':
      return (
        <span
          title="Extração parcial via assunto do email"
          className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 border border-line text-ink-3 bg-paper-2"
        >
          parcial
        </span>
      )
    case 'manual_required':
      return (
        <span
          title="Dados insuficientes — preencher antes de aprovar"
          className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 border border-amber-500 text-amber-800 bg-yellow-soft"
        >
          preencher
        </span>
      )
    case 'manual':
    default:
      return null
  }
}
