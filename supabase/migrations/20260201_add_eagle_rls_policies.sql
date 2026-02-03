-- Migration: Add RLS policies for Eagle tables
-- These policies allow public access since the app doesn't have authentication yet
-- In production, replace with proper user-based policies

-- ============================================
-- egl_sites
-- ============================================
ALTER TABLE egl_sites ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "egl_sites_public_select" ON egl_sites
  FOR SELECT TO public
  USING (true);

-- Allow public insert
CREATE POLICY "egl_sites_public_insert" ON egl_sites
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow public update
CREATE POLICY "egl_sites_public_update" ON egl_sites
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

-- Allow public delete
CREATE POLICY "egl_sites_public_delete" ON egl_sites
  FOR DELETE TO public
  USING (true);

-- ============================================
-- egl_houses
-- ============================================
ALTER TABLE egl_houses ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "egl_houses_public_select" ON egl_houses
  FOR SELECT TO public
  USING (true);

-- Allow public insert
CREATE POLICY "egl_houses_public_insert" ON egl_houses
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow public update
CREATE POLICY "egl_houses_public_update" ON egl_houses
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

-- Allow public delete
CREATE POLICY "egl_houses_public_delete" ON egl_houses
  FOR DELETE TO public
  USING (true);

-- ============================================
-- egl_timeline
-- ============================================
ALTER TABLE egl_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egl_timeline_public_select" ON egl_timeline
  FOR SELECT TO public
  USING (true);

CREATE POLICY "egl_timeline_public_insert" ON egl_timeline
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "egl_timeline_public_update" ON egl_timeline
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_timeline_public_delete" ON egl_timeline
  FOR DELETE TO public
  USING (true);

-- ============================================
-- egl_photos
-- ============================================
ALTER TABLE egl_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egl_photos_public_select" ON egl_photos
  FOR SELECT TO public
  USING (true);

CREATE POLICY "egl_photos_public_insert" ON egl_photos
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "egl_photos_public_update" ON egl_photos
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_photos_public_delete" ON egl_photos
  FOR DELETE TO public
  USING (true);

-- ============================================
-- egl_issues
-- ============================================
ALTER TABLE egl_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egl_issues_public_select" ON egl_issues
  FOR SELECT TO public
  USING (true);

CREATE POLICY "egl_issues_public_insert" ON egl_issues
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "egl_issues_public_update" ON egl_issues
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_issues_public_delete" ON egl_issues
  FOR DELETE TO public
  USING (true);

-- ============================================
-- egl_progress
-- ============================================
ALTER TABLE egl_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egl_progress_public_select" ON egl_progress
  FOR SELECT TO public
  USING (true);

CREATE POLICY "egl_progress_public_insert" ON egl_progress
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "egl_progress_public_update" ON egl_progress
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_progress_public_delete" ON egl_progress
  FOR DELETE TO public
  USING (true);

-- ============================================
-- egl_scans
-- ============================================
ALTER TABLE egl_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egl_scans_public_select" ON egl_scans
  FOR SELECT TO public
  USING (true);

CREATE POLICY "egl_scans_public_insert" ON egl_scans
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "egl_scans_public_update" ON egl_scans
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_scans_public_delete" ON egl_scans
  FOR DELETE TO public
  USING (true);

-- ============================================
-- ref_eagle_phases (reference table - read only)
-- ============================================
ALTER TABLE ref_eagle_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_eagle_phases_public_select" ON ref_eagle_phases
  FOR SELECT TO public
  USING (true);

-- ============================================
-- ref_eagle_phase_items (reference table - read only)
-- ============================================
ALTER TABLE ref_eagle_phase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_eagle_phase_items_public_select" ON ref_eagle_phase_items
  FOR SELECT TO public
  USING (true);
