-- ============================================
-- FIX RLS POLICIES FOR ANONYMOUS ACCESS
-- The monitor app doesn't have authentication,
-- so we need to allow anon access for document uploads
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view document links" ON egl_document_links;
DROP POLICY IF EXISTS "Users can create document links" ON egl_document_links;
DROP POLICY IF EXISTS "Users can delete document links" ON egl_document_links;
DROP POLICY IF EXISTS "Users can view batches" ON egl_document_batches;
DROP POLICY IF EXISTS "Users can create batches" ON egl_document_batches;
DROP POLICY IF EXISTS "Users can update batches" ON egl_document_batches;

-- Recreate policies with public access (anon key)
CREATE POLICY "Public can view document links" ON egl_document_links
  FOR SELECT TO public USING (TRUE);
CREATE POLICY "Public can create document links" ON egl_document_links
  FOR INSERT TO public WITH CHECK (TRUE);
CREATE POLICY "Public can delete document links" ON egl_document_links
  FOR DELETE TO public USING (TRUE);

CREATE POLICY "Public can view batches" ON egl_document_batches
  FOR SELECT TO public USING (TRUE);
CREATE POLICY "Public can create batches" ON egl_document_batches
  FOR INSERT TO public WITH CHECK (TRUE);
CREATE POLICY "Public can update batches" ON egl_document_batches
  FOR UPDATE TO public USING (TRUE);

-- Also ensure egl_documents allows public access (it likely already does)
-- Check and add if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'egl_documents'
    AND policyname = 'Public can insert documents'
  ) THEN
    CREATE POLICY "Public can insert documents" ON egl_documents
      FOR INSERT TO public WITH CHECK (TRUE);
  END IF;
END $$;
