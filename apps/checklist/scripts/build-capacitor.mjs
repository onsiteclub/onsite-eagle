#!/usr/bin/env node
/**
 * Build the checklist app in static-export mode for Capacitor.
 *
 * `output: 'export'` can't coexist with API routes, middleware, or
 * dynamic `[param]` routes that lack `generateStaticParams`. Those
 * files are only used by the web (PWA) deployment on Vercel, so we
 * move them out of the way for the duration of this build and
 * restore them afterwards — even if the build fails.
 *
 * Usage: node scripts/build-capacitor.mjs
 * Invoked by `npm run build:native`.
 */

import { existsSync, renameSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const root = join(process.cwd())

// Paths that must be hidden during static export.
// Tuples are [active path, backup path].
const shelves = [
  ['app/api', 'app/__web_api_backup'],
  ['app/auth', 'app/__web_auth_backup'],
  ['middleware.ts', '__web_middleware_backup.ts'],
  ['app/app/lot/[lotId]', 'app/app/lot/__web_lotId_backup'],
  ['app/report/[token]', 'app/report/__web_token_backup'],
  ['app/self/check/[transition]', 'app/self/check/__web_transition_backup'],
]

function safeRename(from, to) {
  if (existsSync(from)) {
    renameSync(from, to)
    return true
  }
  return false
}

function stash() {
  for (const [active, backup] of shelves) {
    safeRename(join(root, active), join(root, backup))
  }
}

function restore() {
  for (const [active, backup] of shelves) {
    safeRename(join(root, backup), join(root, active))
  }
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, BUILD_TARGET: 'capacitor' },
  })
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status}`)
  }
}

let exitCode = 0
try {
  stash()
  run('npx', ['next', 'build'])
  run('npx', ['cap', 'sync'])
} catch (err) {
  console.error('\n[build-capacitor] FAILED:', err.message)
  exitCode = 1
} finally {
  restore()
}

process.exit(exitCode)
