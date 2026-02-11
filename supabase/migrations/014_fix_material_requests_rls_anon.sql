-- ============================================
-- FIX RLS POLICIES FOR MATERIAL REQUESTS - ANONYMOUS ACCESS
-- The monitor app doesn't have authentication,
-- so we need to allow anon/public access for material requests
-- ============================================

-- Drop existing policies on egl_material_requests
DROP POLICY IF EXISTS "Authenticated users can read material requests" ON egl_material_requests;
DROP POLICY IF EXISTS "Authenticated users can create material requests" ON egl_material_requests;
DROP POLICY IF EXISTS "Authenticated users can update material requests" ON egl_material_requests;
DROP POLICY IF EXISTS "No hard delete on material requests" ON egl_material_requests;

-- Recreate with public access (for anon key)
CREATE POLICY "Public can read material requests"
  ON egl_material_requests FOR SELECT TO public
  USING (deleted_at IS NULL);

CREATE POLICY "Public can create material requests"
  ON egl_material_requests FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Public can update material requests"
  ON egl_material_requests FOR UPDATE TO public
  USING (deleted_at IS NULL);

-- Still no hard delete
CREATE POLICY "No hard delete on material requests"
  ON egl_material_requests FOR DELETE TO public
  USING (false);

-- Also fix ref_material_types to allow public read
DROP POLICY IF EXISTS "Anyone can read material types" ON ref_material_types;

CREATE POLICY "Public can read material types"
  ON ref_material_types FOR SELECT TO public
  USING (is_active = true);

-- Fix operator assignments as well (for future operator app)
DROP POLICY IF EXISTS "Authenticated users can read operator assignments" ON egl_operator_assignments;
DROP POLICY IF EXISTS "Authenticated users can insert operator assignments" ON egl_operator_assignments;
DROP POLICY IF EXISTS "Authenticated users can update operator assignments" ON egl_operator_assignments;

CREATE POLICY "Public can read operator assignments"
  ON egl_operator_assignments FOR SELECT TO public
  USING (true);

CREATE POLICY "Public can insert operator assignments"
  ON egl_operator_assignments FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Public can update operator assignments"
  ON egl_operator_assignments FOR UPDATE TO public
  USING (true);
