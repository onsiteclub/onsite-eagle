import 'server-only'

export type CsvInvoiceRow = {
  invoice_number: string | null
  received_at: string
  client_name: string | null
  client_email: string | null
  gc_name: string | null
  site_address: string | null
  amount_gross: number
  amount_hst: number | null
  amount_received: number | null
  status: string
}

function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function formatDate(iso: string): string {
  return iso.split('T')[0]
}

/**
 * Gera CSV para envio ao contador. Formato canadense padrão:
 * vírgula separador, ponto decimal, UTF-8 com BOM (pro Excel renderizar acentos).
 */
export function generateCsv(rows: CsvInvoiceRow[]): string {
  const header = [
    'invoice_number',
    'received_at',
    'client_name',
    'client_email',
    'gc',
    'site_address',
    'amount_gross',
    'amount_hst',
    'amount_received',
    'status',
  ]

  const lines = [header.join(',')]

  for (const r of rows) {
    lines.push(
      [
        escape(r.invoice_number),
        escape(formatDate(r.received_at)),
        escape(r.client_name),
        escape(r.client_email),
        escape(r.gc_name),
        escape(r.site_address),
        escape(r.amount_gross.toFixed(2)),
        escape(r.amount_hst !== null ? r.amount_hst.toFixed(2) : ''),
        escape(r.amount_received !== null ? r.amount_received.toFixed(2) : ''),
        escape(r.status),
      ].join(','),
    )
  }

  // BOM + CRLF para compatibilidade com Excel.
  return '﻿' + lines.join('\r\n') + '\r\n'
}
