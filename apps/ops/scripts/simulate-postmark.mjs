#!/usr/bin/env node
// =============================================================================
// Simulate a Postmark inbound webhook locally.
//
// Usage:
//   node apps/ops/scripts/simulate-postmark.mjs <to> <from> [subject] [pdfPath]
//
// Examples:
//   node apps/ops/scripts/simulate-postmark.mjs paulo@onsiteclub.ca joao@gmail.com
//   node apps/ops/scripts/simulate-postmark.mjs paulo@onsiteclub.ca joao@gmail.com "Invoice $2840"
//   node apps/ops/scripts/simulate-postmark.mjs paulo@onsiteclub.ca joao@gmail.com "Invoice $100" ./some.pdf
//
// Reads POSTMARK_INBOUND_WEBHOOK_SECRET from apps/ops/.env.local automatically.
// Reads NEXT_PUBLIC_APP_URL; fallback http://localhost:3008.
// =============================================================================

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx), l.slice(idx + 1)]
    }),
)

const APP_URL = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3008'
const SECRET = env.POSTMARK_INBOUND_WEBHOOK_SECRET
if (!SECRET) {
  console.error('Missing POSTMARK_INBOUND_WEBHOOK_SECRET in apps/ops/.env.local')
  process.exit(1)
}

const [to, from, subject = 'Invoice $123.45', pdfPath] = process.argv.slice(2)
if (!to || !from) {
  console.error('Usage: node simulate-postmark.mjs <to> <from> [subject] [pdfPath]')
  process.exit(1)
}

// Build a tiny valid PDF if no path provided.
let pdfBase64
if (pdfPath) {
  pdfBase64 = readFileSync(resolve(pdfPath)).toString('base64')
} else {
  // Minimal 1-page blank PDF (valid structure, ~240 bytes).
  const minimalPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\n' +
      'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n' +
      'trailer<</Size 4/Root 1 0 R>>\nstartxref\n158\n%%EOF',
    'utf8',
  )
  // Add a nonce so each run generates a unique hash (or keep stable for dedup test).
  const nonce = randomUUID()
  pdfBase64 = Buffer.concat([minimalPdf, Buffer.from(`\n%${nonce}`)]).toString(
    'base64',
  )
}

const payload = {
  From: from,
  FromName: from.split('@')[0].replace(/[._]/g, ' '),
  To: to,
  Subject: subject,
  Date: new Date().toISOString(),
  MessageID: randomUUID(),
  TextBody: 'Anexo em PDF.',
  Attachments: [
    {
      Name: 'invoice.pdf',
      ContentType: 'application/pdf',
      Content: pdfBase64,
      ContentLength: Buffer.from(pdfBase64, 'base64').length,
    },
  ],
}

const url = `${APP_URL}/api/inbox?token=${SECRET}`
console.log(`→ POST ${url}`)
console.log(`  To: ${to}  From: ${from}  Subject: ${subject}`)

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

const text = await res.text()
console.log(`← ${res.status}  ${text}`)
process.exit(res.ok ? 0 : 1)
