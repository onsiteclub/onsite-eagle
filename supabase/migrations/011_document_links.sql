-- ============================================
-- EXTEND DOCUMENT SYSTEM FOR BULK UPLOAD
-- ============================================

-- 1. Create batches table first
CREATE TABLE IF NOT EXISTS egl_document_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES egl_sites(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'processing',
  total_files INTEGER DEFAULT 0,
  processed_files INTEGER DEFAULT 0,
  linked_files INTEGER DEFAULT 0,
  unlinked_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES core_profiles(id),
  uploaded_by_name VARCHAR(200),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns to existing egl_documents table
ALTER TABLE egl_documents
ADD COLUMN IF NOT EXISTS parsed_lot_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS parsing_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES egl_document_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Create document links table (N:N relationship)
CREATE TABLE IF NOT EXISTS egl_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES egl_documents(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,
  link_type VARCHAR(30) DEFAULT 'auto_parsed',
  show_in_timeline BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES core_profiles(id),
  UNIQUE(document_id, house_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_egl_documents_batch ON egl_documents(batch_id);
CREATE INDEX IF NOT EXISTS idx_egl_documents_parsed_lot ON egl_documents(parsed_lot_number);
CREATE INDEX IF NOT EXISTS idx_egl_document_links_doc ON egl_document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_egl_document_links_house ON egl_document_links(house_id);
CREATE INDEX IF NOT EXISTS idx_egl_document_batches_site ON egl_document_batches(site_id);

-- 5. RLS
ALTER TABLE egl_document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE egl_document_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document links" ON egl_document_links
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can create document links" ON egl_document_links
  FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Users can delete document links" ON egl_document_links
  FOR DELETE TO authenticated USING (TRUE);

CREATE POLICY "Users can view batches" ON egl_document_batches
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can create batches" ON egl_document_batches
  FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Users can update batches" ON egl_document_batches
  FOR UPDATE TO authenticated USING (TRUE);

-- 6. View for lot documents (read-only in lot Documents tab)
CREATE OR REPLACE VIEW v_house_documents AS
SELECT
  dl.house_id,
  dl.id as link_id,
  d.id as document_id,
  d.name as file_name,
  d.file_url,
  d.file_type,
  d.file_size as file_size_bytes,
  d.category as document_type,
  d.description,
  d.uploaded_by,
  dl.link_type,
  dl.show_in_timeline,
  d.created_at as uploaded_at
FROM egl_document_links dl
JOIN egl_documents d ON dl.document_id = d.id
WHERE d.deleted_at IS NULL
ORDER BY d.created_at DESC;

-- 7. Function to auto-link document
CREATE OR REPLACE FUNCTION auto_link_document_to_lot(
  p_document_id UUID,
  p_site_id UUID,
  p_lot_number VARCHAR,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_house_id UUID;
  v_link_id UUID;
BEGIN
  SELECT id INTO v_house_id
  FROM egl_houses
  WHERE site_id = p_site_id AND lot_number = p_lot_number;

  IF v_house_id IS NOT NULL THEN
    INSERT INTO egl_document_links (document_id, house_id, link_type, created_by)
    VALUES (p_document_id, v_house_id, 'auto_parsed', p_created_by)
    ON CONFLICT (document_id, house_id) DO NOTHING
    RETURNING id INTO v_link_id;
    RETURN v_link_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
