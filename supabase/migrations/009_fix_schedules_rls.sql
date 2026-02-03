-- Migration: Fix RLS policies for Construction Intelligence Engine tables
-- Author: Cerbero
-- Date: 2026-02-03
-- Description: Add public access policies to egl_schedules, egl_schedule_phases,
--              and egl_external_events tables (same pattern as other Eagle tables)
--
-- Problem: These tables were created with RLS enabled but only had policies for
--          "authenticated" users, not "public". This caused queries from unauthenticated
--          clients to return zero rows.

-- ============================================
-- egl_schedules - Drop existing policy and add public ones
-- ============================================

-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "egl_schedules_auth_all" ON egl_schedules;

-- Allow public read
CREATE POLICY "egl_schedules_public_select" ON egl_schedules
  FOR SELECT TO public
  USING (true);

-- Allow public insert
CREATE POLICY "egl_schedules_public_insert" ON egl_schedules
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow public update
CREATE POLICY "egl_schedules_public_update" ON egl_schedules
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

-- Allow public delete
CREATE POLICY "egl_schedules_public_delete" ON egl_schedules
  FOR DELETE TO public
  USING (true);

-- ============================================
-- egl_schedule_phases - Drop existing policy and add public ones
-- ============================================

-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "egl_schedule_phases_auth_all" ON egl_schedule_phases;

-- Allow public read
CREATE POLICY "egl_schedule_phases_public_select" ON egl_schedule_phases
  FOR SELECT TO public
  USING (true);

-- Allow public insert
CREATE POLICY "egl_schedule_phases_public_insert" ON egl_schedule_phases
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow public update
CREATE POLICY "egl_schedule_phases_public_update" ON egl_schedule_phases
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

-- Allow public delete
CREATE POLICY "egl_schedule_phases_public_delete" ON egl_schedule_phases
  FOR DELETE TO public
  USING (true);

-- ============================================
-- egl_external_events - Drop existing policy and add public ones
-- ============================================

-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "egl_external_events_auth_all" ON egl_external_events;

-- Allow public read
CREATE POLICY "egl_external_events_public_select" ON egl_external_events
  FOR SELECT TO public
  USING (true);

-- Allow public insert
CREATE POLICY "egl_external_events_public_insert" ON egl_external_events
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow public update
CREATE POLICY "egl_external_events_public_update" ON egl_external_events
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

-- Allow public delete
CREATE POLICY "egl_external_events_public_delete" ON egl_external_events
  FOR DELETE TO public
  USING (true);

-- ============================================
-- ref_schedule_templates - Add public read (already has it but let's ensure)
-- ============================================

-- The existing policy is for is_active = true, let's keep that
-- but also add a general public select for all (for admin usage)
DROP POLICY IF EXISTS "ref_schedule_templates_public_read" ON ref_schedule_templates;

CREATE POLICY "ref_schedule_templates_public_select" ON ref_schedule_templates
  FOR SELECT TO public
  USING (true);

-- Allow public insert (for creating templates)
CREATE POLICY "ref_schedule_templates_public_insert" ON ref_schedule_templates
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow public update
CREATE POLICY "ref_schedule_templates_public_update" ON ref_schedule_templates
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

-- ============================================
-- END OF MIGRATION
-- ============================================
