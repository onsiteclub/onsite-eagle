-- ============================================================================
-- Migration: Lot Documents Table
-- ============================================================================
-- Author: Cerbero (Guardian of Supabase)
-- Date: 2026-02-02
-- Description: Create egl_documents table for storing lot-related files
--              (plans, permits, contracts, photos, etc.)
-- ============================================================================

-- Create documents table
CREATE TABLE IF NOT EXISTS egl_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope (lot-specific or site-wide)
  site_id UUID REFERENCES egl_sites(id) ON DELETE CASCADE,
  house_id UUID REFERENCES egl_houses(id) ON DELETE CASCADE,

  -- File information
  name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  file_type VARCHAR(50),
  file_size BIGINT,

  -- Categorization
  category VARCHAR(50) DEFAULT 'other',
  description TEXT,

  -- AI analysis (for future use)
  ai_analyzed BOOLEAN DEFAULT FALSE,
  ai_summary TEXT,
  ai_extracted_data JSONB,

  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one of site_id or house_id must be set
  CONSTRAINT document_scope_check CHECK (site_id IS NOT NULL OR house_id IS NOT NULL)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_egl_documents_house
  ON egl_documents(house_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_egl_documents_site
  ON egl_documents(site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_egl_documents_category
  ON egl_documents(category);

-- Enable RLS
ALTER TABLE egl_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Read documents" ON egl_documents;
CREATE POLICY "Read documents" ON egl_documents
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Insert documents" ON egl_documents;
CREATE POLICY "Insert documents" ON egl_documents
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Update documents" ON egl_documents;
CREATE POLICY "Update documents" ON egl_documents
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Delete documents" ON egl_documents;
CREATE POLICY "Delete documents" ON egl_documents
  FOR DELETE TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE egl_documents IS 'Documents storage for lots and sites (plans, permits, contracts, photos)';
COMMENT ON COLUMN egl_documents.category IS 'Type: plan, permit, contract, inspection_report, photo, drawing, other';
COMMENT ON COLUMN egl_documents.ai_analyzed IS 'Whether AI has analyzed this document';
COMMENT ON COLUMN egl_documents.ai_summary IS 'AI-generated summary of document content';
COMMENT ON COLUMN egl_documents.ai_extracted_data IS 'Structured data extracted by AI (dates, names, etc.)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
