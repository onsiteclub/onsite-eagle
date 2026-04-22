#!/usr/bin/env node
// =============================================================================
// Preflight — valida que o ambiente ops está pronto pra rodar.
// Rodar:
//   node apps/ops/scripts/preflight.mjs
//
// Lê .env.local automaticamente. Use --env=.env.production para checar prod.
// Sai com código 1 se alguma checagem crítica falhar.
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envArg = process.argv.find((a) => a.startsWith('--env='))
const envFile = envArg ? envArg.split('=')[1] : '.env.local'
const envPath = resolve(__dirname, '..', envFile)

let raw
try {
  raw = readFileSync(envPath, 'utf8')
} catch {
  fail(`Env file not found: ${envPath}`)
  process.exit(1)
}

const env = Object.fromEntries(
  raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx), l.slice(idx + 1)]
    }),
)

const results = []
let criticalFailed = 0

function pass(name, extra = '') {
  results.push({ status: 'ok', name, extra })
}
function warn(name, extra = '') {
  results.push({ status: 'warn', name, extra })
}
function fail(name, extra = '') {
  results.push({ status: 'fail', name, extra })
  criticalFailed++
}

// =============================================================================
// 1. Env vars
// =============================================================================
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'INBOX_DOMAIN',
]
const optional = ['POSTMARK_INBOUND_WEBHOOK_SECRET', 'RESEND_API_KEY']

for (const key of required) {
  if (env[key]) pass(`env.${key}`)
  else fail(`env.${key}`, 'missing — required')
}
for (const key of optional) {
  if (env[key]) pass(`env.${key}`)
  else warn(`env.${key}`, 'missing — feature disabled')
}

if (criticalFailed > 0) {
  printReport()
  process.exit(1)
}

// =============================================================================
// 2. Supabase connectivity + schema
// =============================================================================
const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const opsTables = [
  'ops_operators',
  'ops_companies',
  'ops_clients',
  'ops_client_company_access',
  'ops_gcs',
  'ops_invoices',
  'ops_invoice_versions',
  'ops_ledger_entries',
  'ops_accountant_contacts',
  'ops_export_logs',
  'ops_inbox_blocklist',
]

for (const table of opsTables) {
  const { error, count } = await sb
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) fail(`table.${table}`, error.message)
  else pass(`table.${table}`, `${count ?? 0} rows`)
}

// =============================================================================
// 3. Storage bucket
// =============================================================================
const { data: buckets, error: bucketsError } = await sb.storage.listBuckets()
if (bucketsError) {
  fail('storage.listBuckets', bucketsError.message)
} else {
  const ops = buckets.find((b) => b.id === 'ops-invoices')
  if (!ops) fail('bucket.ops-invoices', 'not found')
  else if (ops.public) warn('bucket.ops-invoices', 'bucket is PUBLIC (should be private)')
  else pass('bucket.ops-invoices', 'private ✓')
}

// =============================================================================
// 4. Webhook endpoint reachable
// =============================================================================
try {
  const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/inbox`, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  })
  if (res.ok) pass('webhook.health', `GET ${env.NEXT_PUBLIC_APP_URL}/api/inbox → ${res.status}`)
  else warn('webhook.health', `status ${res.status}`)
} catch (e) {
  warn('webhook.health', `unreachable: ${e.message}`)
}

// =============================================================================
// 5. Webhook auth (rejects missing token)
// =============================================================================
try {
  const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/inbox`, {
    method: 'POST',
    body: '{}',
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(5000),
  })
  if (res.status === 401) pass('webhook.auth', 'rejects missing token (401) ✓')
  else fail('webhook.auth', `expected 401, got ${res.status}`)
} catch (e) {
  warn('webhook.auth', `unreachable: ${e.message}`)
}

// =============================================================================
// Report
// =============================================================================
printReport()
process.exit(criticalFailed > 0 ? 1 : 0)

function printReport() {
  const symbols = { ok: '✓', warn: '!', fail: '✗' }
  const colors = { ok: '\x1b[32m', warn: '\x1b[33m', fail: '\x1b[31m' }
  const reset = '\x1b[0m'

  console.log(`\nPreflight: ${envFile}\n${'─'.repeat(60)}`)
  for (const r of results) {
    console.log(
      `${colors[r.status]}${symbols[r.status]}${reset}  ${r.name.padEnd(42)} ${r.extra}`,
    )
  }

  const passCount = results.filter((r) => r.status === 'ok').length
  const warnCount = results.filter((r) => r.status === 'warn').length
  const failCount = results.filter((r) => r.status === 'fail').length
  console.log(
    `${'─'.repeat(60)}\n${passCount} ok · ${warnCount} warn · ${failCount} fail\n`,
  )
  if (failCount > 0) {
    console.log('❌  Preflight falhou — corrija os erros acima antes de deployar.\n')
  } else if (warnCount > 0) {
    console.log('⚠   Preflight passou com warnings. Features opcionais desabilitadas.\n')
  } else {
    console.log('✅  Preflight limpo.\n')
  }
}
