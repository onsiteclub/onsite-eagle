# Ops — Backend Spec

Everything the UI mockup cannot communicate: data model, integrations, business rules.

---

## Stack

- Next.js 16.1.6 + React 19 + TypeScript + Tailwind v4 (already scaffolded in `apps/ops/`)
- Supabase **GiantGate instance** for DB, auth, storage. All tables prefixed `ops_`.
- Postmark Inbound for receiving invoice emails.
- Resend for outbound (accountant ZIP).
- `pdf-lib` for XMP metadata extraction.
- Storage bucket: `ops_invoices`.
- PWA from day one: manifest + service worker, installable, push notifications.

---

## Communication with Timekeeper

**Email only.** No shared database, no API. Timekeeper generates a PDF with embedded XMP metadata; the worker emails it to Paul's inbound address; Postmark calls `/api/inbound`. Do not propose tighter coupling.

XMP namespace: `http://schemas.onsiteclub.ca/invoice/1.0/` (prefix `onsite`). Fields: `invoice_number`, `amount`, `hst`, `currency`, `gc_name`, `site_address`, `issuer_email`, `issuer_name`, `company_name`, `company_hst_number`, `hours_logged`, `issued_at`, `timekeeper_version`, `version`.

If XMP is present → invoice auto-fills, badge "TIMEKEEPER". If absent → Paul enters manually, badge "EXTERNAL PDF". **Do not auto-parse filenames or subject lines to guess fields.** The friction differential is the product's commercial mechanism.

---

## Schema (essential tables)

```
ops_persons
  id, name, email (unique), operator_fee_percent, created_at, blocked_at

ops_companies
  id, name, prefix (e.g. "JK-A"), hst_number, default_fee_percent, accountant_email

ops_invoices                              -- append-only, never UPDATE the source row
  id, person_id, company_id,
  invoice_number, version (default 1),
  amount, hst, currency,
  source ("timekeeper" | "external"),
  xmp_raw (jsonb, nullable),
  postmark_message_id (for dedup),
  pdf_storage_path,
  issued_at, received_at,
  status ("pending_review" | "accepted" | "superseded" | "discarded"),
  supersedes_invoice_id (nullable)

ops_ledger_entries                        -- append-only, source of truth for balances
  id, person_id,
  type ("invoice" | "payment" | "advance" | "correction" | "reversal"),
  amount (signed: negative = Paul owes more, positive = debt reduced),
  related_invoice_id (nullable),
  note,
  created_at, created_by,
  reversed_by_entry_id (nullable)

ops_exports
  id, lot_code ("EXP-2026-04-JK-v1"),
  company_id, period_from, period_to,
  invoice_count, total_amount, hst_total,
  sent_to_email, sent_at,
  zip_storage_path

ops_blocked_senders
  email (pk), blocked_at, blocked_by
```

RLS on every table. All queries scoped to the authenticated user (supervisor).

---

## Balance calculation

Never store balance. Always compute:

```sql
SELECT SUM(amount) FROM ops_ledger_entries WHERE person_id = $1
```

For the running balance column in the ledger UI, use a window function:

```sql
SELECT *, SUM(amount) OVER (ORDER BY created_at) AS running_balance
FROM ops_ledger_entries
WHERE person_id = $1
ORDER BY created_at
```

Balance semantics: **negative = Paul owes the worker**, positive = worker has credit (unconsumed advance).

---

## Append-only rule

Nothing is ever deleted or updated in `ops_invoices` or `ops_ledger_entries` after insert. Required for CRA compliance and audit.

**Corrections are new rows.** Examples:

- Paul marks invoice paid by mistake → insert a `reversal` entry with opposite amount and set `reversed_by_entry_id` on the original.
- Worker sends v2 of an invoice with a higher amount → keep v1 row in `ops_invoices` with `status=superseded` and set `supersedes_invoice_id` on v2; insert a `correction` entry in the ledger with the delta.
- Amount typed wrong → insert a `correction` entry. Original invoice row stays intact.

The UI's footer text "Append-only · N movements · nothing deleted" must reflect reality.

---

## Postmark inbound webhook (`/api/inbound`)

On each incoming email:

1. Check `ops_blocked_senders`. If sender matches, drop silently. Log only.
2. Check `postmark_message_id` in `ops_invoices`. If exists, it's a retry — ignore.
3. Extract first PDF attachment. If none, drop (log to an `ops_inbound_errors` table).
4. Upload PDF to `ops_invoices` storage bucket.
5. Parse XMP metadata via `pdf-lib`. Try namespace `onsite`.
6. Determine state:
   - **Known sender + XMP present**: create `ops_invoices` row, status `pending_review`. Realtime push to Inbox.
   - **Known sender + no XMP**: same, but `source="external"` and XMP fields blank.
   - **Unknown sender**: create `ops_invoices` row but do NOT create a `ops_persons` row yet. Paul decides in the Inbox (link / add / block).
   - **Existing invoice_number for this person + higher `version` in XMP**: create new `ops_invoices` row, flag as conflict for Paul to resolve in the compare modal.
7. Do NOT create `ops_ledger_entries` yet. Ledger entries are only created when Paul **accepts** the invoice (explicit action from Inbox).

---

## Version conflict resolution

When Paul acts on a conflict row:

- **Keep v1**: set `status=discarded` on v2. No ledger change.
- **Accept v2**: set `status=superseded` on v1; set `status=accepted` on v2 with `supersedes_invoice_id = v1.id`. Insert a `correction` ledger entry with amount `= v2.amount - v1.amount` (can be positive or negative).
- **Decide later**: no-op, row stays flagged in Inbox.

---

## Payment flow (reconciliation)

When Paul clicks an open invoice and goes through the modals:

1. Confirms whether the GC check matched the invoice amount exactly, or enters a different received amount.
2. Cash breakdown displayed (client-side): `received - (received × fee%) - unconsumed_advances = cash_to_worker`.
3. On confirm, insert a `payment` ledger entry with `amount = +invoice.amount` (or `+received` if different), `related_invoice_id` set. If the received amount differs from the invoice, also insert a `correction` entry for the delta. If there were unconsumed advances, they are implicitly consumed by the new balance — no extra entry needed, but the note on the payment should read e.g. `"$3,502 cash · $618 fee (15%) · $800 advance consumed"`.

---

## Advance flow

Simple: modal with amount + date. Insert a single `advance` ledger entry with positive amount and no `related_invoice_id`. The note field stays empty by default.

---

## Closing / export flow

1. Paul configures period + company + accountant email.
2. "Generate package" action:
   - Query all `ops_invoices` with `status=accepted` for that company within the period.
   - Build CSV: one row per invoice (number, date, person, amount, HST, status, source).
   - Build summary (counts, totals, HST).
   - ZIP all PDFs + CSV + summary.txt.
   - Upload ZIP to storage. Insert `ops_exports` row with `lot_code` pattern `EXP-YYYY-MM-{company.prefix}-v{N}` where N is 1 for first export in that period, 2 if regenerated, etc.
3. "Send batch" action: email via Resend to the accountant with the ZIP as attachment (or a signed download link if size > 20 MB). Update `ops_exports.sent_at`.

Warnings shown before generate:
- Invoices with unresolved version conflicts
- Invoices flagged `pending_review` in the period
- Any unlinked senders (existing `ops_invoices` where the person hasn't been added/linked/blocked)

These warnings should link back to the relevant Inbox rows.

---

## Realtime

Subscribe the Inbox UI to `ops_invoices` INSERT events for this user. New rows appear without refresh. The "Inbound active · X min ago" indicator in the main header reads from a lightweight query (last received_at).

---

## Auth

Email-password via Supabase Auth. Single-user per account for now (Paul is the only supervisor). Multi-user / team is explicitly out of scope.

---

## i18n

`next-intl` with one locale file: `en.json`. Do not hard-code strings in components — extract them now, even though we only ship English. A Portuguese locale will be added later without touching component code.

---

## Out of scope (do not build)

- Automatic invoice parsing from filename/subject when XMP is absent
- Dashboards, charts, aging reports
- Tags, categories, labels
- Inline editing of past entries
- Comments, attachments per ledger entry
- Multi-user, team access
- Fuzzy duplicate matching across different invoice numbers
- AI-assisted autofill of external PDFs

If one of these feels needed, stop and ask.
