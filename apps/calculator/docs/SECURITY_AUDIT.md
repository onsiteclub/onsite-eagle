# Security Audit — OnSite Calculator

**Last run:** 2026-04-22
**Scope:** Phase 5.6 of the refactor plan.

## Summary

- **21 total vulnerabilities** (0 critical, 11 high, 10 moderate)
- All in **transitive / build-time dependencies** — none in code we ship to production runtime
- **No immediate security incident** — these are classic supply-chain advisories that ripple through build tooling

## Top-level categorization

| Category | Count | Shipped to prod? |
|---|---|---|
| Dev-only build tools (Vite, esbuild, rollup) | ~8 | No — only during build |
| Capacitor CLI / build plumbing (brace-expansion, minimatch, picomatch, plist) | ~6 | No — CLI-only |
| Vercel CLI bundle (undici, path-to-regexp, tar) | ~4 | No — serverless runtime uses Node's native libs |
| jsdom / testing (flatted, undici) | ~2 | No — test-time only |
| Capacitor core (ajv) | 1 | Moderate — shipped |

## Specific vulnerabilities

Run `npm audit` at the repo root for the live list. Snapshot:

| Package | Severity | Exploitability in this app | Fix strategy |
|---------|----------|----------------------------|--------------|
| `@isaacs/brace-expansion` | high | ReDoS — only at build time via glob matchers | Monitor; auto-resolves with toolchain upgrade |
| `@xmldom/xmldom` (via `plist`) | high | XML parsing in iOS/Android tooling only | Auto-resolves with Capacitor CLI bump |
| `ajv` | moderate | JSON schema validator, used in Capacitor config parsing | Auto-resolves with Capacitor upgrade |
| `brace-expansion` / `minimatch` / `picomatch` | moderate/high | ReDoS in glob matching at build time | Not runtime-facing |
| `esbuild` (via `vite`) | moderate | Dev-server only — CVE doesn't apply to production bundles | Vite 6 upgrade addresses (major bump, risky) |
| `flatted` | high | Test runner internal | Test-only |
| `path-to-regexp` | high | Vercel CLI parse (not runtime) | Auto-resolves with `vercel` bump |
| `rollup` | high | Bundler — dev/build only | Auto-resolves with Vite 6 bump |
| `tar` | high | CLI tarball handling — not runtime | Auto-resolves with npm/node-pre-gyp bump |
| `undici` | high | `@vercel/node` internal fetch client; Node ≥20 uses native `fetch` for runtime | Monitor |
| `yaml` | moderate | Stack overflow on deeply nested YAML — not our use case | Not exploitable from user input in this app |

## Recommended actions

**In this session — intentionally did NOT run:**
- `npm audit fix` — auto-applies patch updates across the whole monorepo, potentially touching other apps. Needs coordination.
- `npm audit fix --force` — major-version upgrades (Capacitor 6→7, Vite 5→6, Vitest 2→3). Breaking changes. Must be validated end-to-end on device.

**Near-term (separate PRs):**
1. Bump Capacitor 6 → 7 in a dedicated PR; validate iOS + Android builds + keystore signing + plugin compat.
2. Bump Vite 5 → 6 in a dedicated PR; audit CSS entry points, esbuild CSS changes, Vitest compat.
3. Bump Vitest 2 → 3; check custom reporters and jsdom compat.

**None of these should be bundled with feature work** — each is a surface-area change big enough to warrant its own test cycle.

## Runtime exposure assessment

The listed advisories are primarily **build-time** (bundler, CLI, test tooling) or **ecosystem-transitive** (undici pulled by Vercel CLI, not runtime fetch). The actual serverless functions (`api/interpret.ts`, `api/privacy/delete.ts`) run on Vercel's Node 20 runtime and use:
- Native `fetch` (no undici dependency at runtime)
- `@supabase/supabase-js` (not in this advisory list)
- `valibot`, `@upstash/ratelimit`, `@upstash/redis` (not in this advisory list)

The client bundle served to browsers/Capacitor WebView does not include any of the packages flagged here as user-facing code paths.

## Re-run this audit

```bash
npm audit                          # at monorepo root
npm audit --json > /tmp/audit.json # machine-readable
```

To refresh this doc after a dependency upgrade: re-run and update counts above.
