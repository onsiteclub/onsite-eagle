-- ============================================================================
-- Migration 031 — Checklist: grant anon the full public /self flow
--
-- The checklist app is 100% public — no auth. Two paths needed anon write
-- access that did not exist before:
--
-- 1. Storage: frm-media bucket had INSERT policy scoped to {authenticated}
--    so photo uploads from /self silently failed with
--    "6 photos failed to upload. Check your connection and try again."
--
-- 2. Tables: frm_shared_reports + frm_shared_report_items had only SELECT
--    for anon. Report creation previously went through /api/reports which
--    used the service role key to bypass RLS; the new client-side flow
--    (lib/client/reports.ts, used by /self/check?t=X) calls INSERT
--    directly with the anon key and would fail post-upload.
--
-- The token held by the client is the de-facto access credential for
-- viewing/editing a shared report. DELETE is intentionally NOT granted.
-- ============================================================================

-- 1. Storage: anon + authenticated may insert / read / update inside
--    frm-media/shared-reports/*.
CREATE POLICY "shared_reports_anon_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'frm-media'
    AND name LIKE 'shared-reports/%'
  );

CREATE POLICY "shared_reports_public_select" ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'frm-media'
    AND name LIKE 'shared-reports/%'
  );

CREATE POLICY "shared_reports_anon_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (
    bucket_id = 'frm-media'
    AND name LIKE 'shared-reports/%'
  )
  WITH CHECK (
    bucket_id = 'frm-media'
    AND name LIKE 'shared-reports/%'
  );

-- 2. Tables: anon + authenticated may insert and update shared reports
--    and their items. SELECT already permitted by earlier policies.
CREATE POLICY "public_insert_reports" ON frm_shared_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "public_update_reports" ON frm_shared_reports
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_insert_items" ON frm_shared_report_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM frm_shared_reports r WHERE r.id = report_id)
  );

CREATE POLICY "public_update_items" ON frm_shared_report_items
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);
