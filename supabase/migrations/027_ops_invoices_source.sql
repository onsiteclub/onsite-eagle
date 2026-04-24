-- =====================================================================
-- Migration 027: OnSite Ops — Invoice source tracking
-- Created: 2026-04-23
-- Scope: Add source + source_version columns to ops_invoices so the
--        inbound webhook can record how the invoice data was extracted.
-- Refs: ops-directive-amendment-xmp.md (Phase 6 amendment)
-- =====================================================================
-- Values of `source`:
--   'xmp'             → extracted from Timekeeper-embedded XMP metadata
--                       (high confidence, preferred path)
--   'subject'         → parsed from email subject line
--                       (partial confidence)
--   'manual_required' → no usable structured data, operator must fill
--   'manual'          → operator created or edited the invoice by hand
--                       (default for records created via UI)
-- =====================================================================

alter table ops_invoices
  add column if not exists source text not null default 'manual'
    check (source in ('xmp', 'subject', 'manual_required', 'manual'));

alter table ops_invoices
  add column if not exists source_version text;

create index if not exists ops_invoices_source_idx
  on ops_invoices(source);

comment on column ops_invoices.source is
  'How invoice data was obtained: xmp | subject | manual_required | manual';

comment on column ops_invoices.source_version is
  'Timekeeper version that generated XMP (debug aid for contract breakage)';
