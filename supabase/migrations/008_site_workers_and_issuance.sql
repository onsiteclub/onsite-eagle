-- ============================================================================
-- Migration: Site Workers and Lot Issuance
-- ============================================================================
-- Author: Cerbero (Guardian of Supabase)
-- Date: 2026-02-02
-- Description:
--   1. Create egl_site_workers table for workers linked to jobsites
--   2. Add issuance fields to egl_houses for lot assignment workflow
-- ============================================================================

-- 1. Create site workers table (workers linked to jobsite, not individual lots)
CREATE TABLE IF NOT EXISTS egl_site_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to site
  site_id UUID REFERENCES egl_sites(id) ON DELETE CASCADE NOT NULL,

  -- Worker identity (can be linked to core_profiles or external)
  worker_id UUID, -- Optional: references core_profiles if worker has account
  worker_name TEXT NOT NULL,
  worker_phone TEXT,
  worker_email TEXT,

  -- Work info
  trade TEXT, -- carpenter, electrician, plumber, etc.
  company_name TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  linked_by UUID, -- supervisor who added them
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate workers per site
  UNIQUE(site_id, worker_name, worker_phone)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_egl_site_workers_site
  ON egl_site_workers(site_id, is_active);

CREATE INDEX IF NOT EXISTS idx_egl_site_workers_worker
  ON egl_site_workers(worker_id) WHERE worker_id IS NOT NULL;

-- Enable RLS
ALTER TABLE egl_site_workers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Read site workers" ON egl_site_workers;
CREATE POLICY "Read site workers" ON egl_site_workers
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Insert site workers" ON egl_site_workers;
CREATE POLICY "Insert site workers" ON egl_site_workers
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Update site workers" ON egl_site_workers;
CREATE POLICY "Update site workers" ON egl_site_workers
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Delete site workers" ON egl_site_workers;
CREATE POLICY "Delete site workers" ON egl_site_workers
  FOR DELETE TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE egl_site_workers IS 'Workers linked to jobsites (can work on multiple lots within the site)';
COMMENT ON COLUMN egl_site_workers.worker_id IS 'Optional link to core_profiles if worker has an account';
COMMENT ON COLUMN egl_site_workers.trade IS 'Worker trade: carpenter, electrician, plumber, roofer, etc.';

-- ============================================================================
-- 2. Add issuance fields to egl_houses
-- ============================================================================

-- Add columns for lot issuance workflow
ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS is_issued BOOLEAN DEFAULT FALSE;
ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS issued_to_worker_id UUID REFERENCES egl_site_workers(id);
ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS issued_to_worker_name TEXT;
ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS issued_by UUID; -- supervisor who issued

-- Create index for issued lots
CREATE INDEX IF NOT EXISTS idx_egl_houses_issued
  ON egl_houses(site_id, is_issued);

-- Comments
COMMENT ON COLUMN egl_houses.is_issued IS 'Whether the lot has been formally issued to a worker';
COMMENT ON COLUMN egl_houses.issued_at IS 'When the lot was issued';
COMMENT ON COLUMN egl_houses.issued_to_worker_id IS 'Worker assigned to this lot (from egl_site_workers)';
COMMENT ON COLUMN egl_houses.issued_to_worker_name IS 'Worker name (denormalized for display)';

-- ============================================================================
-- 3. Insert a test worker for development
-- ============================================================================

-- Note: This requires a site_id. We'll insert via API instead.

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
