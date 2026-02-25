-- =====================================================================
-- Migration 018: Rename Timekeeper + Eagle Tables (Group 4 — Maximum Risk)
--
-- DIRECTIVE 2026-02-01: Canonical naming convention
-- Strategy: RENAME table → CREATE VIEW with old name for backward-compat
--
-- Tables affected:
--   app_timekeeper_entries    → tmk_entries
--   app_timekeeper_geofences  → tmk_geofences
--   app_timekeeper_projects   → tmk_projects
--   app_eagle_sites           → egl_sites
--   app_eagle_houses          → egl_houses
--   app_eagle_house_progress  → egl_progress
--   app_eagle_phase_photos    → egl_photos
--   app_eagle_timeline_events → egl_timeline
--   app_eagle_issues          → egl_issues
--   app_eagle_plan_scans      → egl_scans
--
-- Risk: MAXIMUM
-- - Timekeeper entries referenced by log_locations, agg_user_daily, access_grants RLS
-- - Eagle sites/houses have complex FK network (schedules, progress, photos, issues)
-- - Multiple RLS policies reference these tables
-- - Supabase Realtime subscriptions may reference table names
--
-- IMPORTANT: Run during LOW TRAFFIC window. Backward-compat views ensure
-- zero downtime, but Realtime channels may need reconfiguration.
-- =====================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- TIMEKEEPER
-- ═══════════════════════════════════════════════════════════════════

-- Projects first (referenced by entries)
ALTER TABLE app_timekeeper_projects RENAME TO tmk_projects;
CREATE OR REPLACE VIEW app_timekeeper_projects AS SELECT * FROM tmk_projects;

-- Geofences (referenced by entries and log_locations)
ALTER TABLE app_timekeeper_geofences RENAME TO tmk_geofences;
CREATE OR REPLACE VIEW app_timekeeper_geofences AS SELECT * FROM tmk_geofences;

-- Entries (most referenced — by logs, aggregations, RLS)
ALTER TABLE app_timekeeper_entries RENAME TO tmk_entries;
CREATE OR REPLACE VIEW app_timekeeper_entries AS SELECT * FROM tmk_entries;

-- NOTE: RLS policies on tmk_entries reference access_grants (or core_access_grants).
-- Since we created backward-compat views in migration 017, RLS continues to work.

-- ═══════════════════════════════════════════════════════════════════
-- EAGLE
-- ═══════════════════════════════════════════════════════════════════

-- Sites first (everything else FKs to sites)
ALTER TABLE app_eagle_sites RENAME TO egl_sites;
CREATE OR REPLACE VIEW app_eagle_sites AS SELECT * FROM egl_sites;

-- Houses (FKs to sites, referenced by progress/photos/issues/schedules)
ALTER TABLE app_eagle_houses RENAME TO egl_houses;
CREATE OR REPLACE VIEW app_eagle_houses AS SELECT * FROM egl_houses;

-- Progress (FKs to houses + phases)
ALTER TABLE app_eagle_house_progress RENAME TO egl_progress;
CREATE OR REPLACE VIEW app_eagle_house_progress AS SELECT * FROM egl_progress;

-- Photos (FKs to houses + phases)
ALTER TABLE app_eagle_phase_photos RENAME TO egl_photos;
CREATE OR REPLACE VIEW app_eagle_phase_photos AS SELECT * FROM egl_photos;

-- Timeline events (FKs to houses)
ALTER TABLE app_eagle_timeline_events RENAME TO egl_timeline;
CREATE OR REPLACE VIEW app_eagle_timeline_events AS SELECT * FROM egl_timeline;

-- Issues (FKs to houses + phases)
ALTER TABLE app_eagle_issues RENAME TO egl_issues;
CREATE OR REPLACE VIEW app_eagle_issues AS SELECT * FROM egl_issues;

-- Plan scans (FKs to sites)
ALTER TABLE app_eagle_plan_scans RENAME TO egl_scans;
CREATE OR REPLACE VIEW app_eagle_plan_scans AS SELECT * FROM egl_scans;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- POST-MIGRATION VERIFICATION CHECKLIST
-- ═══════════════════════════════════════════════════════════════════
--
-- [ ] SELECT count(*) FROM tmk_entries;
-- [ ] SELECT count(*) FROM app_timekeeper_entries;  -- via view
-- [ ] SELECT count(*) FROM egl_sites;
-- [ ] SELECT count(*) FROM app_eagle_sites;  -- via view
-- [ ] SELECT count(*) FROM egl_houses WHERE site_id IS NOT NULL;
-- [ ] INSERT into tmk_entries (test RLS as authenticated user)
-- [ ] Verify Supabase Realtime still receives events on egl_messages
-- [ ] Verify access_grants-based RLS on tmk_entries still works
-- [ ] Verify all FK constraints are intact:
--     SELECT conname, conrelid::regclass, confrelid::regclass
--     FROM pg_constraint WHERE contype = 'f'
--     AND (conrelid::regclass::text LIKE 'tmk_%'
--          OR conrelid::regclass::text LIKE 'egl_%');
