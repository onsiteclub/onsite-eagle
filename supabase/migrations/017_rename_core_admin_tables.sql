-- =====================================================================
-- Migration 017: Rename Admin/Voice/Sharing Tables (Group 3 — High Risk)
--
-- DIRECTIVE 2026-02-01: Canonical naming convention
-- Strategy: RENAME table → CREATE VIEW with old name for backward-compat
--
-- Tables affected:
--   admin_users       → core_admin_users
--   admin_logs        → core_admin_logs
--   voice_logs        → core_voice_logs
--   access_grants     → core_access_grants
--   pending_tokens    → core_pending_tokens
--   argus_conversations → core_ai_conversations
--
-- Risk: HIGH
-- - admin_users is referenced by RLS helper functions (is_active_admin, is_super_admin)
-- - access_grants is referenced in RLS policies on 6+ tables
-- - pending_tokens has SECURITY DEFINER function (lookup_pending_token)
-- - voice_logs is FK'd from app_calculator_calculations
--
-- IMPORTANT: After this migration, verify RLS functions still work.
-- PostgreSQL RENAME preserves OIDs so functions should auto-follow,
-- but SECURITY DEFINER functions may need manual verification.
-- =====================================================================

BEGIN;

-- ─── Admin ────────────────────────────────────────────────────────

ALTER TABLE admin_users RENAME TO core_admin_users;
CREATE OR REPLACE VIEW admin_users AS SELECT * FROM core_admin_users;

ALTER TABLE admin_logs RENAME TO core_admin_logs;
CREATE OR REPLACE VIEW admin_logs AS SELECT * FROM core_admin_logs;

-- NOTE: Verify is_active_admin() and is_super_admin() still work
-- These are SECURITY DEFINER functions that query admin_users.
-- Since we created a backward-compat view, they should still work.

-- ─── Voice ────────────────────────────────────────────────────────

ALTER TABLE voice_logs RENAME TO core_voice_logs;
CREATE OR REPLACE VIEW voice_logs AS SELECT * FROM core_voice_logs;

-- NOTE: ccl_calculations.voice_log_id FK → core_voice_logs.id
-- The FK constraint follows the rename automatically.

-- ─── Sharing ──────────────────────────────────────────────────────

ALTER TABLE access_grants RENAME TO core_access_grants;
CREATE OR REPLACE VIEW access_grants AS SELECT * FROM core_access_grants;

-- NOTE: RLS policies on tmk_entries, tmk_geofences, tmk_projects,
-- core_profiles reference 'access_grants'. Since we created the view,
-- existing RLS policies continue to work via the view.
-- New code should reference 'core_access_grants' directly.

ALTER TABLE pending_tokens RENAME TO core_pending_tokens;
CREATE OR REPLACE VIEW pending_tokens AS SELECT * FROM core_pending_tokens;

-- NOTE: lookup_pending_token() SECURITY DEFINER function queries pending_tokens.
-- The backward-compat view ensures it continues to work.

-- ─── AI ───────────────────────────────────────────────────────────

-- Only rename if the table exists (it may have been created with new name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'argus_conversations') THEN
    ALTER TABLE argus_conversations RENAME TO core_ai_conversations;
    EXECUTE 'CREATE OR REPLACE VIEW argus_conversations AS SELECT * FROM core_ai_conversations';
  END IF;
END $$;

COMMIT;

-- Post-migration verification:
-- SELECT is_active_admin();  -- should still work
-- SELECT count(*) FROM core_admin_users;
-- SELECT count(*) FROM admin_users;  -- via view
-- SELECT count(*) FROM core_access_grants;
-- INSERT into tmk_entries should still respect RLS
