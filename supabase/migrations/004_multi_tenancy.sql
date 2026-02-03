-- ============================================================================
-- MIGRATION 004: Multi-Tenancy Foundation
-- ============================================================================
-- Purpose: Add organization support for SaaS multi-tenancy
-- Author: Cerbero (via Claude)
-- Date: 2026-02-02
--
-- This migration:
-- 1. Creates core_organizations and core_org_memberships tables
-- 2. Adds organization_id to ALL tenant-scoped tables
-- 3. Links tmk_geofences to egl_sites (Timekeeper ↔ Eagle)
-- 4. Adds sqft fields to egl_houses (for billing by sqft)
-- 5. Adds metadata/schema_version to egl_photos (for Prumo training)
-- 6. Creates RLS policies for organization isolation
-- ============================================================================

-- ============================================================================
-- PART 1: ORGANIZATION TABLES
-- ============================================================================

-- Organizations (construtoras, framing companies, etc.)
CREATE TABLE IF NOT EXISTS core_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,

  -- Ownership
  owner_id UUID REFERENCES core_profiles(id) ON DELETE SET NULL,

  -- Billing
  billing_plan VARCHAR(50) DEFAULT 'pilot' CHECK (billing_plan IN ('pilot', 'starter', 'professional', 'enterprise')),
  billing_email VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships (workers can belong to multiple orgs)
CREATE TABLE IF NOT EXISTS core_org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,

  -- Role in this organization
  role VARCHAR(30) NOT NULL CHECK (role IN ('owner', 'admin', 'supervisor', 'inspector', 'worker')),

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),

  -- Invitation tracking
  invited_by UUID REFERENCES core_profiles(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One membership per org per user
  UNIQUE(organization_id, profile_id)
);

-- Indexes for memberships
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON core_org_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_profile ON core_org_memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON core_org_memberships(organization_id, role);

-- ============================================================================
-- PART 2: ADD organization_id TO TENANT TABLES
-- ============================================================================

-- Eagle tables
ALTER TABLE egl_sites ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE egl_progress ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE egl_photos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE egl_timeline ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE egl_issues ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE egl_scans ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE egl_messages ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;

-- Timekeeper tables
ALTER TABLE tmk_entries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE tmk_geofences ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE tmk_projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;

-- Calculator tables
ALTER TABLE ccl_calculations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;
ALTER TABLE ccl_templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;

-- Intelligence tables (org-scoped reports)
ALTER TABLE int_ai_reports ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES core_organizations(id) ON DELETE CASCADE;

-- Indexes for organization_id (critical for RLS performance)
CREATE INDEX IF NOT EXISTS idx_egl_sites_org ON egl_sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_egl_houses_org ON egl_houses(organization_id);
CREATE INDEX IF NOT EXISTS idx_egl_photos_org ON egl_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_egl_messages_org ON egl_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_tmk_entries_org ON tmk_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_tmk_geofences_org ON tmk_geofences(organization_id);

-- ============================================================================
-- PART 3: LINK TIMEKEEPER ↔ EAGLE (tmk_geofences.site_id → egl_sites)
-- ============================================================================

-- Add site_id to geofences (optional - a geofence CAN be linked to an Eagle site)
ALTER TABLE tmk_geofences ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES egl_sites(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tmk_geofences_site ON tmk_geofences(site_id);

-- Comment for clarity
COMMENT ON COLUMN tmk_geofences.site_id IS 'Optional link to egl_sites - enables correlation of hours worked with construction progress photos';

-- ============================================================================
-- PART 4: SQFT FIELDS FOR BILLING (egl_houses)
-- ============================================================================

ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS sqft_main_floors DECIMAL(10,2) DEFAULT 0;
ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS sqft_roof DECIMAL(10,2) DEFAULT 0;
ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS sqft_basement DECIMAL(10,2) DEFAULT 0;
ALTER TABLE egl_houses ADD COLUMN IF NOT EXISTS sqft_total DECIMAL(10,2) GENERATED ALWAYS AS (sqft_main_floors + sqft_roof + sqft_basement) STORED;

-- Pricing tiers table
CREATE TABLE IF NOT EXISTS core_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Rates per sqft (CAD)
  rate_main_floors DECIMAL(8,5) NOT NULL DEFAULT 0.00500, -- $0.005/sqft
  rate_roof DECIMAL(8,5) NOT NULL DEFAULT 0.00300,        -- $0.003/sqft
  rate_basement DECIMAL(8,5) NOT NULL DEFAULT 0.00250,    -- $0.0025/sqft

  currency VARCHAR(3) DEFAULT 'CAD',
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing tier
INSERT INTO core_pricing_tiers (name, description, rate_main_floors, rate_roof, rate_basement)
VALUES ('Standard', 'Default pricing for framing companies', 0.00500, 0.00300, 0.00250)
ON CONFLICT DO NOTHING;

-- Link organization to pricing tier
ALTER TABLE core_organizations ADD COLUMN IF NOT EXISTS pricing_tier_id UUID REFERENCES core_pricing_tiers(id);

-- ============================================================================
-- PART 5: PHOTO METADATA FOR PRUMO TRAINING
-- ============================================================================

-- Add metadata fields to egl_photos
ALTER TABLE egl_photos ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE egl_photos ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;
ALTER TABLE egl_photos ADD COLUMN IF NOT EXISTS quality_score FLOAT;
ALTER TABLE egl_photos ADD COLUMN IF NOT EXISTS is_training_eligible BOOLEAN DEFAULT false;
ALTER TABLE egl_photos ADD COLUMN IF NOT EXISTS photo_type VARCHAR(30) DEFAULT 'progress' CHECK (photo_type IN ('progress', 'detail', 'issue', 'overview', 'completion'));

-- Comment on metadata structure
COMMENT ON COLUMN egl_photos.metadata IS 'Required: device_model, gps_accuracy, capture_conditions:{lighting,weather}, compass_heading';
COMMENT ON COLUMN egl_photos.is_training_eligible IS 'True after quality check passes - eligible for Prumo AI training';

-- ============================================================================
-- PART 6: HELPER FUNCTIONS FOR MULTI-TENANCY
-- ============================================================================

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM core_org_memberships
  WHERE profile_id = auth.uid()
  AND status = 'active';
$$;

-- Function to check if user belongs to an organization
CREATE OR REPLACE FUNCTION user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core_org_memberships
    WHERE profile_id = auth.uid()
    AND organization_id = org_id
    AND status = 'active'
  );
$$;

-- Function to get user's role in an organization
CREATE OR REPLACE FUNCTION get_user_org_role(org_id UUID)
RETURNS VARCHAR
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM core_org_memberships
  WHERE profile_id = auth.uid()
  AND organization_id = org_id
  AND status = 'active'
  LIMIT 1;
$$;

-- Function to check if user is admin/owner in org
CREATE OR REPLACE FUNCTION user_is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core_org_memberships
    WHERE profile_id = auth.uid()
    AND organization_id = org_id
    AND status = 'active'
    AND role IN ('owner', 'admin')
  );
$$;

-- ============================================================================
-- PART 7: RLS POLICIES FOR MULTI-TENANCY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE core_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- -------------------------
-- core_organizations RLS
-- -------------------------

-- Users can see orgs they belong to
CREATE POLICY "org_select_member" ON core_organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_organization_ids()));

-- Only owners can update their org
CREATE POLICY "org_update_owner" ON core_organizations
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Anyone can create an org (they become owner)
CREATE POLICY "org_insert_auth" ON core_organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only owners can delete
CREATE POLICY "org_delete_owner" ON core_organizations
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- -------------------------
-- core_org_memberships RLS
-- -------------------------

-- Users can see memberships in their orgs
CREATE POLICY "membership_select_org" ON core_org_memberships
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    OR profile_id = auth.uid()
  );

-- Admins can insert memberships (invite)
CREATE POLICY "membership_insert_admin" ON core_org_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_is_org_admin(organization_id));

-- Admins can update memberships
CREATE POLICY "membership_update_admin" ON core_org_memberships
  FOR UPDATE TO authenticated
  USING (user_is_org_admin(organization_id))
  WITH CHECK (user_is_org_admin(organization_id));

-- Admins can delete memberships (but not self if owner)
CREATE POLICY "membership_delete_admin" ON core_org_memberships
  FOR DELETE TO authenticated
  USING (
    user_is_org_admin(organization_id)
    AND NOT (profile_id = auth.uid() AND role = 'owner')
  );

-- -------------------------
-- core_pricing_tiers RLS
-- -------------------------
CREATE POLICY "pricing_select_all" ON core_pricing_tiers
  FOR SELECT TO authenticated
  USING (is_active = true);

-- -------------------------
-- TEMPLATE: Multi-tenant RLS for egl_* and tmk_* tables
-- -------------------------

-- Drop existing permissive policies and replace with org-scoped ones

-- egl_sites
DROP POLICY IF EXISTS "egl_sites_auth_all" ON egl_sites;
CREATE POLICY "egl_sites_org_select" ON egl_sites
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_sites_org_insert" ON egl_sites
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_sites_org_update" ON egl_sites
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_sites_org_delete" ON egl_sites
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

-- egl_houses
DROP POLICY IF EXISTS "egl_houses_auth_all" ON egl_houses;
CREATE POLICY "egl_houses_org_select" ON egl_houses
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_houses_org_insert" ON egl_houses
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_houses_org_update" ON egl_houses
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_houses_org_delete" ON egl_houses
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

-- egl_photos
DROP POLICY IF EXISTS "egl_photos_auth_all" ON egl_photos;
CREATE POLICY "egl_photos_org_select" ON egl_photos
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_photos_org_insert" ON egl_photos
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_photos_org_update" ON egl_photos
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_photos_org_delete" ON egl_photos
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

-- egl_messages
DROP POLICY IF EXISTS "egl_messages_auth_all" ON egl_messages;
CREATE POLICY "egl_messages_org_select" ON egl_messages
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_messages_org_insert" ON egl_messages
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_messages_org_update" ON egl_messages
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "egl_messages_org_delete" ON egl_messages
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

-- tmk_entries (keep user_id check for personal entries + org check)
DROP POLICY IF EXISTS "Users manage own entries" ON tmk_entries;
DROP POLICY IF EXISTS "Viewers can see shared entries" ON tmk_entries;
CREATE POLICY "tmk_entries_org_select" ON tmk_entries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_organization_ids())
    OR EXISTS (
      SELECT 1 FROM core_access_grants
      WHERE owner_id = tmk_entries.user_id
      AND viewer_id = auth.uid()
      AND status = 'active'
    )
  );
CREATE POLICY "tmk_entries_org_insert" ON tmk_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "tmk_entries_org_update" ON tmk_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "tmk_entries_org_delete" ON tmk_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- tmk_geofences
DROP POLICY IF EXISTS "Users manage own geofences" ON tmk_geofences;
DROP POLICY IF EXISTS "Viewers can see shared geofences" ON tmk_geofences;
CREATE POLICY "tmk_geofences_org_select" ON tmk_geofences
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_organization_ids())
    OR EXISTS (
      SELECT 1 FROM core_access_grants
      WHERE owner_id = tmk_geofences.user_id
      AND viewer_id = auth.uid()
      AND status = 'active'
    )
  );
CREATE POLICY "tmk_geofences_org_insert" ON tmk_geofences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "tmk_geofences_org_update" ON tmk_geofences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_is_org_admin(organization_id));
CREATE POLICY "tmk_geofences_org_delete" ON tmk_geofences
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- PART 8: TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_core_organizations_updated_at
  BEFORE UPDATE ON core_organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_core_org_memberships_updated_at
  BEFORE UPDATE ON core_org_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PART 9: VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: User's organizations with their role
CREATE OR REPLACE VIEW v_my_organizations AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.logo_url,
  o.billing_plan,
  o.status as org_status,
  m.role,
  m.status as membership_status,
  m.joined_at,
  o.created_at
FROM core_organizations o
JOIN core_org_memberships m ON m.organization_id = o.id
WHERE m.profile_id = auth.uid()
AND m.status = 'active';

-- View: Organization members (for admins)
CREATE OR REPLACE VIEW v_org_members AS
SELECT
  m.organization_id,
  m.profile_id,
  m.role,
  m.status,
  m.joined_at,
  p.email,
  p.full_name,
  p.avatar_url
FROM core_org_memberships m
JOIN core_profiles p ON p.id = m.profile_id
WHERE m.organization_id IN (SELECT get_user_organization_ids());

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comment to track migration
COMMENT ON TABLE core_organizations IS 'Multi-tenant organizations - created in migration 004';
COMMENT ON TABLE core_org_memberships IS 'User-org relationships with roles - created in migration 004';
