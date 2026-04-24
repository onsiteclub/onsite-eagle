-- =====================================================================
-- Migration 028: OnSite Ops — Unprocessed inbound emails
-- Created: 2026-04-23
-- Scope: Persist emails that hit the inbox webhook but couldn't become an
--        invoice (no PDF attachment, unreadable PDF, etc). Before this,
--        those emails were silently acknowledged with 200 OK and lost.
-- Refs: /api/inbox route; Sprint 2 TODO in route.ts ("log for review").
-- =====================================================================

create table ops_inbox_unprocessed (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,
  from_email text not null,
  from_name text,
  subject text,
  received_at timestamptz not null,
  raw_email_id text,
  reason text not null
    check (reason in ('no_pdf', 'pdf_unreadable', 'blocked_recovered', 'other')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index ops_inbox_unprocessed_operator_idx
  on ops_inbox_unprocessed(operator_id, resolved_at nulls first, received_at desc);

alter table ops_inbox_unprocessed enable row level security;

-- Operators see and mutate only their own. Webhook uses service_role, which
-- bypasses RLS — no dedicated insert policy needed for the webhook path.
create policy "ops_inbox_unprocessed_all_own"
  on ops_inbox_unprocessed for all to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()))
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

comment on table ops_inbox_unprocessed is
  'Emails that hit /api/inbox but failed to become invoices (no PDF etc). Operator reviews and dismisses via resolved_at.';
