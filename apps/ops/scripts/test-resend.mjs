#!/usr/bin/env node
// Smoke test: envia um email único via Resend pra confirmar chave + sender.
// Uso: node apps/ops/scripts/test-resend.mjs <destino@email.com>

import { Resend } from 'resend'
import { readFileSync } from 'node:fs'
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

const to = process.argv[2]
if (!to) {
  console.error('Uso: node test-resend.mjs <destino@email.com>')
  process.exit(1)
}

if (!env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY não encontrado em .env.local')
  process.exit(1)
}

const resend = new Resend(env.RESEND_API_KEY)
const { data, error } = await resend.emails.send({
  from: 'dev@onsiteclub.ca',
  to,
  subject: 'OnSite Ops — smoke test',
  html: `<p>Se você leu isso, Resend está plugado corretamente no app ops.</p>
         <p style="font-family:monospace;font-size:12px;color:#666">
         ${new Date().toISOString()}
         </p>`,
})

if (error) {
  console.error('✗ Falhou:', error)
  process.exit(1)
}
console.log(`✓ Enviado → id ${data.id}`)
console.log(`  De: dev@onsiteclub.ca  Pra: ${to}`)
console.log(`  Checa em https://resend.com/emails`)
