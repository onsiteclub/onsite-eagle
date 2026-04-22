-- =====================================================================
-- Migration 023: OnSite Ops — Invoice/Ledger System
-- Created: 2026-04-21
-- Scope: Web app for construction sub-sub-contractors managing
--        client invoices received by email.
-- Prefix: ops_
-- Project: dbasazrdbtigrdntaehb
-- =====================================================================

-- =====================================================================
-- 1. ops_operators (user 1:1 with auth.users)
-- =====================================================================
create table ops_operators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  inbox_username text not null unique,
  default_fee_percent numeric(5,2) not null default 15.00,
  created_at timestamptz not null default now()
);
create index ops_operators_user_id_idx on ops_operators(user_id);
create index ops_operators_inbox_username_idx on ops_operators(inbox_username);

alter table ops_operators enable row level security;

create policy "ops_operators_select_own"
  on ops_operators for select to authenticated
  using (user_id = auth.uid());

create policy "ops_operators_insert_self"
  on ops_operators for insert to authenticated
  with check (user_id = auth.uid());

create policy "ops_operators_update_own"
  on ops_operators for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =====================================================================
-- 2. ops_companies
-- =====================================================================
create table ops_companies (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  hst_number text,
  wsib_number text,
  address text,
  invoice_prefix text not null,
  current_invoice_number integer not null default 0,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index ops_companies_operator_id_idx on ops_companies(operator_id);

alter table ops_companies enable row level security;

create policy "ops_companies_all_own"
  on ops_companies for all to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()))
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- =====================================================================
-- 3. ops_clients
-- =====================================================================
create table ops_clients (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,
  email text not null,
  display_name text not null,
  phone text,
  fee_percent_override numeric(5,2),
  status text not null default 'active'
    check (status in ('active', 'blocked', 'archived')),
  first_invoice_at timestamptz,
  created_at timestamptz not null default now(),
  unique (operator_id, email)
);
create index ops_clients_operator_id_idx on ops_clients(operator_id);
create index ops_clients_email_idx on ops_clients(email);

alter table ops_clients enable row level security;

create policy "ops_clients_all_own"
  on ops_clients for all to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()))
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- =====================================================================
-- 4. ops_client_company_access (N:N)
-- =====================================================================
create table ops_client_company_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references ops_clients(id) on delete cascade,
  company_id uuid not null references ops_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, company_id)
);
create index ops_cca_client_idx on ops_client_company_access(client_id);
create index ops_cca_company_idx on ops_client_company_access(company_id);

alter table ops_client_company_access enable row level security;

create policy "ops_cca_all_own"
  on ops_client_company_access for all to authenticated
  using (
    client_id in (
      select c.id from ops_clients c
      join ops_operators o on o.id = c.operator_id
      where o.user_id = auth.uid()
    )
  )
  with check (
    client_id in (
      select c.id from ops_clients c
      join ops_operators o on o.id = c.operator_id
      where o.user_id = auth.uid()
    )
  );

-- =====================================================================
-- 5. ops_gcs (General Contractors: Mattamy, Minto, Tamarack…)
-- =====================================================================
create table ops_gcs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,
  name text not null,
  default_payment_method text not null default 'cheque'
    check (default_payment_method in ('cheque', 'eft', 'mixed')),
  notes text,
  created_at timestamptz not null default now()
);
create index ops_gcs_operator_id_idx on ops_gcs(operator_id);

alter table ops_gcs enable row level security;

create policy "ops_gcs_all_own"
  on ops_gcs for all to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()))
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- =====================================================================
-- 6. ops_invoices
-- =====================================================================
create table ops_invoices (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,
  client_id uuid references ops_clients(id) on delete set null,
  company_id uuid references ops_companies(id) on delete set null,
  gc_id uuid references ops_gcs(id) on delete set null,

  invoice_number text,
  pdf_url text not null,
  pdf_hash text,

  amount_gross numeric(12,2) not null,
  amount_hst numeric(12,2),
  amount_received numeric(12,2),

  from_email text not null,
  from_name text,
  subject text,
  received_at timestamptz not null,
  raw_email_id text,

  status text not null default 'pending'
    check (status in (
      'pending', 'new_sender', 'rejected', 'approved',
      'paid_by_gc', 'paid_to_client', 'locked'
    )),

  site_address text,
  divergence_flagged boolean not null default false,
  divergence_amount numeric(12,2),
  operator_notes text,

  approved_at timestamptz,
  paid_by_gc_at timestamptz,
  paid_to_client_at timestamptz,
  locked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ops_invoices_operator_status_idx on ops_invoices(operator_id, status);
create index ops_invoices_client_idx on ops_invoices(client_id);
create index ops_invoices_received_at_idx on ops_invoices(received_at desc);
create index ops_invoices_gc_idx on ops_invoices(gc_id);
create index ops_invoices_company_idx on ops_invoices(company_id);

alter table ops_invoices enable row level security;

create policy "ops_invoices_select_own"
  on ops_invoices for select to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()));

create policy "ops_invoices_insert_own"
  on ops_invoices for insert to authenticated
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- Block updates on locked invoices (fiscal immutability).
-- WITH CHECK lets us transition status → 'locked' itself.
create policy "ops_invoices_update_unlocked"
  on ops_invoices for update to authenticated
  using (
    operator_id in (select id from ops_operators where user_id = auth.uid())
    and status != 'locked'
  )
  with check (
    operator_id in (select id from ops_operators where user_id = auth.uid())
  );

-- No DELETE policy — fiscal records are immutable.

-- =====================================================================
-- 7. ops_invoice_versions (duplicate-arrival history)
-- =====================================================================
create table ops_invoice_versions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references ops_invoices(id) on delete cascade,
  version_number integer not null,
  amount_gross numeric(12,2) not null,
  pdf_url text not null,
  pdf_hash text,
  received_at timestamptz not null,
  is_current boolean not null default true,
  rejected boolean not null default false,
  unique (invoice_id, version_number)
);
create index ops_invoice_versions_invoice_idx on ops_invoice_versions(invoice_id);

alter table ops_invoice_versions enable row level security;

create policy "ops_invoice_versions_select_own"
  on ops_invoice_versions for select to authenticated
  using (
    invoice_id in (
      select i.id from ops_invoices i
      join ops_operators o on o.id = i.operator_id
      where o.user_id = auth.uid()
    )
  );

create policy "ops_invoice_versions_insert_own"
  on ops_invoice_versions for insert to authenticated
  with check (
    invoice_id in (
      select i.id from ops_invoices i
      join ops_operators o on o.id = i.operator_id
      where o.user_id = auth.uid()
    )
  );

create policy "ops_invoice_versions_update_own"
  on ops_invoice_versions for update to authenticated
  using (
    invoice_id in (
      select i.id from ops_invoices i
      join ops_operators o on o.id = i.operator_id
      where o.user_id = auth.uid()
    )
  );

-- =====================================================================
-- 8. ops_ledger_entries (append-only statement)
-- =====================================================================
create table ops_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,
  client_id uuid not null references ops_clients(id) on delete cascade,
  entry_type text not null
    check (entry_type in (
      'invoice_received', 'gc_payment_received',
      'advance_paid', 'cash_paid_full',
      'operator_fee', 'adjustment'
    )),
  amount numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  invoice_id uuid references ops_invoices(id) on delete set null,
  settled_by_invoice_id uuid references ops_invoices(id) on delete set null,
  description text,
  entry_date date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index ops_ledger_operator_client_date_idx
  on ops_ledger_entries(operator_id, client_id, entry_date desc);
create index ops_ledger_invoice_idx on ops_ledger_entries(invoice_id);
create index ops_ledger_settled_by_idx
  on ops_ledger_entries(settled_by_invoice_id)
  where settled_by_invoice_id is not null;

alter table ops_ledger_entries enable row level security;

create policy "ops_ledger_select_own"
  on ops_ledger_entries for select to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()));

create policy "ops_ledger_insert_own"
  on ops_ledger_entries for insert to authenticated
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- UPDATE allowed only to set settled_by_invoice_id (advance settlement).
-- Amount/balance/entry_type remain immutable in practice (enforced in app layer).
create policy "ops_ledger_update_settle"
  on ops_ledger_entries for update to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()))
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- No DELETE — fiscal immutability.

-- =====================================================================
-- 9. ops_accountant_contacts
-- =====================================================================
create table ops_accountant_contacts (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,
  email text not null,
  name text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);
create index ops_accountant_operator_idx on ops_accountant_contacts(operator_id);

alter table ops_accountant_contacts enable row level security;

create policy "ops_accountant_all_own"
  on ops_accountant_contacts for all to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()))
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- =====================================================================
-- 10. ops_export_logs
-- =====================================================================
create table ops_export_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,
  company_id uuid references ops_companies(id) on delete set null,
  period_start date not null,
  period_end date not null,
  accountant_email text not null,
  zip_url text,
  invoice_count integer not null,
  total_amount numeric(12,2) not null,
  sent_at timestamptz not null default now()
);
create index ops_export_logs_operator_idx on ops_export_logs(operator_id);

alter table ops_export_logs enable row level security;

create policy "ops_export_logs_select_own"
  on ops_export_logs for select to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()));

create policy "ops_export_logs_insert_own"
  on ops_export_logs for insert to authenticated
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- =====================================================================
-- 11. ops_inbox_blocklist
-- =====================================================================
create table ops_inbox_blocklist (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references ops_operators(id) on delete cascade,
  blocked_email text not null,
  reason text,
  blocked_at timestamptz not null default now(),
  unique (operator_id, blocked_email)
);
create index ops_blocklist_operator_idx on ops_inbox_blocklist(operator_id);

alter table ops_inbox_blocklist enable row level security;

create policy "ops_blocklist_all_own"
  on ops_inbox_blocklist for all to authenticated
  using (operator_id in (select id from ops_operators where user_id = auth.uid()))
  with check (operator_id in (select id from ops_operators where user_id = auth.uid()));

-- =====================================================================
-- 12. updated_at trigger (used by ops_invoices)
-- =====================================================================
create or replace function ops_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger ops_invoices_touch_updated_at
  before update on ops_invoices
  for each row execute function ops_touch_updated_at();

-- =====================================================================
-- 13. Storage bucket: ops-invoices (private)
-- =====================================================================
insert into storage.buckets (id, name, public)
  values ('ops-invoices', 'ops-invoices', false)
  on conflict (id) do nothing;

-- Bucket is private. All reads go through signed URLs generated server-side
-- (server.ts / service.ts). Writes happen only via service_role in the
-- /api/inbox webhook. No authenticated user policies needed — service_role
-- bypasses RLS, and authenticated reads use signed URLs which also bypass RLS.
