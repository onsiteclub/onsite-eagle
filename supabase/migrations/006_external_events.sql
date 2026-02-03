-- ============================================================================
-- Migration: External Events Table
-- ============================================================================
-- Author: Cerbero (Guardian of Supabase)
-- Date: 2026-02-02
-- Description: Create egl_external_events table for calendar events
--              (inspections, deliveries, meetings, etc.)
-- ============================================================================

-- Create external events table
CREATE TABLE IF NOT EXISTS egl_external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope (site-wide or house-specific)
  site_id UUID REFERENCES egl_sites(id) ON DELETE CASCADE,
  house_id UUID REFERENCES egl_houses(id) ON DELETE CASCADE,

  -- Event type (simplified for AI compatibility)
  event_type VARCHAR(50) NOT NULL DEFAULT 'other',

  -- Event details
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- When it happens
  event_date DATE NOT NULL,

  -- Source of information
  source VARCHAR(50),

  -- Impact assessment
  impact_severity VARCHAR(20) DEFAULT 'none',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one of site_id or house_id must be set
  CONSTRAINT event_scope_check CHECK (site_id IS NOT NULL OR house_id IS NOT NULL)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_egl_external_events_house
  ON egl_external_events(house_id, event_date);

CREATE INDEX IF NOT EXISTS idx_egl_external_events_site
  ON egl_external_events(site_id, event_date);

-- Enable RLS
ALTER TABLE egl_external_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Read events" ON egl_external_events;
CREATE POLICY "Read events" ON egl_external_events
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Insert events" ON egl_external_events;
CREATE POLICY "Insert events" ON egl_external_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Delete events" ON egl_external_events;
CREATE POLICY "Delete events" ON egl_external_events
  FOR DELETE TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE egl_external_events IS 'Calendar events for sites and lots (inspections, deliveries, meetings)';
COMMENT ON COLUMN egl_external_events.event_type IS 'Type: inspection_scheduled, material_delivered, other, etc.';
COMMENT ON COLUMN egl_external_events.source IS 'Source: ai_chat_analysis, manual, etc.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
