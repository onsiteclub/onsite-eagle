-- =====================================================================
-- Migration 029: OnSite Ops — Unified inbox message log
-- Created: 2026-04-24
-- Scope: Record every inbound email (with or without PDF) as a first-class
--        row in the inbox feed. An invoice (ops_invoices) is still created
--        when a PDF is attached, but the inbox UI reads from this new table
--        and joins back to ops_invoices when relevant.
--
-- Rationale: the mockup shows a single flat chronological inbox with inline
-- state labels (NEW SENDER, CONFLICT, TIMEKEEPER, EXTERNAL PDF, MESSAGE,
-- REPLY). Messages without PDF must appear in the list — replies to existing
-- invoices, business chat, etc — not be dropped.
--
-- Threading: by email reply headers (In-Reply-To, References). Two independent
-- invoices from the same person are independent rows even if minutes apart.
--
-- Refs: apps/ops/mockup-v4.html, apps/ops/ops-ui-directive.md
-- =====================================================================

create table ops_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,

  -- Raw email identity (from Postmark payload)
  message_id text not null,               -- Postmark MessageID (unique per operator)
  in_reply_to_message_id text,            -- text, matches the MessageID of the parent
  parent_message_id uuid references ops_inbox_messages(id) on delete set null,

  from_email text not null,
  from_name text,
  subject text,
  received_at timestamptz not null,

  -- If this email carried a PDF that became an invoice
  invoice_id uuid references ops_invoices(id) on delete set null,

  -- State drives the UI label. Kept denormalized (webhook decides once, UI
  -- doesn't recompute) so lookup is O(1) per row.
  state text not null check (state in (
    'new_sender',
    'conflict',
    'timekeeper',
    'external_pdf',
    'message',
    'reply'
  )),

  created_at timestamptz not null default now(),

  unique (operator_id, message_id)
);

create index ops_inbox_messages_operator_received_idx
  on ops_inbox_messages(operator_id, received_at desc);

create index ops_inbox_messages_parent_idx
  on ops_inbox_messages(parent_message_id)
  where parent_message_id is not null;

create index ops_inbox_messages_invoice_idx
  on ops_inbox_messages(invoice_id)
  where invoice_id is not null;

create index ops_inbox_messages_in_reply_to_idx
  on ops_inbox_messages(operator_id, in_reply_to_message_id)
  where in_reply_to_message_id is not null;

alter table ops_inbox_messages enable row level security;

create policy "ops_inbox_messages_select_own"
  on ops_inbox_messages for select to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- Webhook uses service_role (bypasses RLS). No INSERT/UPDATE policy for
-- authenticated — the inbox feed is write-only via webhook. Operators
-- interact with downstream entities (invoices, ledger), not the message log.

comment on table ops_inbox_messages is
  'Append-only log of every inbound email. UI source of truth for /inbox. Joins to ops_invoices when email carried a PDF.';
