-- =====================================================================
-- Migration 015: Rename Billing Tables (Group 1 — Low Risk)
--
-- DIRECTIVE 2026-02-01: Canonical naming convention
-- Strategy: RENAME table → CREATE VIEW with old name for backward-compat
--
-- Tables affected:
--   billing_products     → bil_products
--   billing_subscriptions → bil_subscriptions
--   payment_history      → bil_payments
--   checkout_codes       → bil_checkout_codes
--
-- Risk: LOW — These tables have no FKs pointing TO them from other tables.
-- Billing subscriptions has FK from user_id → core_profiles, but that's outgoing.
-- =====================================================================

BEGIN;

-- ─── billing_products → bil_products ─────────────────────────────

-- Check: no other tables FK to billing_products
ALTER TABLE billing_products RENAME TO bil_products;

-- Backward-compat view (old code can still SELECT)
CREATE OR REPLACE VIEW billing_products AS SELECT * FROM bil_products;

-- RLS policies come with the renamed table (no action needed)
-- Indexes come with the renamed table (no action needed)

-- ─── billing_subscriptions → bil_subscriptions ──────────────────

ALTER TABLE billing_subscriptions RENAME TO bil_subscriptions;
CREATE OR REPLACE VIEW billing_subscriptions AS SELECT * FROM bil_subscriptions;

-- ─── payment_history → bil_payments ─────────────────────────────

ALTER TABLE payment_history RENAME TO bil_payments;
CREATE OR REPLACE VIEW payment_history AS SELECT * FROM bil_payments;

-- ─── checkout_codes → bil_checkout_codes ────────────────────────

ALTER TABLE checkout_codes RENAME TO bil_checkout_codes;
CREATE OR REPLACE VIEW checkout_codes AS SELECT * FROM bil_checkout_codes;

COMMIT;

-- Post-migration verification:
-- SELECT count(*) FROM bil_products;
-- SELECT count(*) FROM billing_products;  -- should work via view
-- SELECT count(*) FROM bil_subscriptions;
-- SELECT count(*) FROM billing_subscriptions;  -- should work via view
