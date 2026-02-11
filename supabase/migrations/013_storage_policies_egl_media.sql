-- ============================================
-- STORAGE POLICIES FOR egl-media BUCKET
-- Allow public uploads for monitor app (no auth)
-- ============================================

-- Allow public to upload files to egl-media bucket
CREATE POLICY "Allow public uploads to egl-media"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'egl-media');

-- Allow public to read files from egl-media bucket
CREATE POLICY "Allow public reads from egl-media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'egl-media');

-- Allow public to update files in egl-media bucket
CREATE POLICY "Allow public updates to egl-media"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'egl-media')
WITH CHECK (bucket_id = 'egl-media');

-- Allow public to delete files from egl-media bucket
CREATE POLICY "Allow public deletes from egl-media"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'egl-media');
