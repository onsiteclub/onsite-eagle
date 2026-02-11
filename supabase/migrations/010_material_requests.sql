-- Migration: 010_material_requests.sql
-- Purpose: Material requests system for operators (maquinistas)
-- Created: 2026-02-03

-- ============================================
-- 1. REFERENCE TABLE: Material Types
-- ============================================

CREATE TABLE IF NOT EXISTS ref_material_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  name_en VARCHAR(100) NOT NULL,
  name_pt VARCHAR(100),
  category VARCHAR(50),
  default_unit VARCHAR(20) DEFAULT 'pcs',
  icon VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data for common construction materials
INSERT INTO ref_material_types (code, name_en, name_pt, category, default_unit, icon, sort_order) VALUES
  ('lumber_2x4', '2x4 Lumber', 'Madeira 2x4', 'framing', 'pcs', '🪵', 10),
  ('lumber_2x6', '2x6 Lumber', 'Madeira 2x6', 'framing', 'pcs', '🪵', 11),
  ('lumber_2x8', '2x8 Lumber', 'Madeira 2x8', 'framing', 'pcs', '🪵', 12),
  ('lumber_2x10', '2x10 Lumber', 'Madeira 2x10', 'framing', 'pcs', '🪵', 13),
  ('lumber_2x12', '2x12 Lumber', 'Madeira 2x12', 'framing', 'pcs', '🪵', 14),
  ('plywood_1_2', 'Plywood 1/2"', 'Compensado 1/2"', 'framing', 'sheets', '🪵', 20),
  ('plywood_3_4', 'Plywood 3/4"', 'Compensado 3/4"', 'framing', 'sheets', '🪵', 21),
  ('osb_7_16', 'OSB 7/16"', 'OSB 7/16"', 'framing', 'sheets', '🪵', 22),
  ('drywall_1_2', 'Drywall 1/2"', 'Drywall 1/2"', 'finishing', 'sheets', '📋', 30),
  ('drywall_5_8', 'Drywall 5/8"', 'Drywall 5/8"', 'finishing', 'sheets', '📋', 31),
  ('insulation_r13', 'Insulation R-13', 'Isolamento R-13', 'insulation', 'rolls', '🧱', 40),
  ('insulation_r20', 'Insulation R-20', 'Isolamento R-20', 'insulation', 'rolls', '🧱', 41),
  ('insulation_r40', 'Insulation R-40', 'Isolamento R-40', 'insulation', 'bags', '🧱', 42),
  ('nails_framing', 'Framing Nails', 'Pregos Estrutura', 'fasteners', 'boxes', '🔩', 50),
  ('nails_finishing', 'Finishing Nails', 'Pregos Acabamento', 'fasteners', 'boxes', '🔩', 51),
  ('screws_drywall', 'Drywall Screws', 'Parafusos Drywall', 'fasteners', 'boxes', '🔩', 52),
  ('screws_deck', 'Deck Screws', 'Parafusos Deck', 'fasteners', 'boxes', '🔩', 53),
  ('concrete_bags', 'Concrete (Bags)', 'Concreto (Sacos)', 'concrete', 'bags', '🧱', 60),
  ('mortar_bags', 'Mortar (Bags)', 'Argamassa (Sacos)', 'concrete', 'bags', '🧱', 61),
  ('shingles', 'Roofing Shingles', 'Telhas', 'roofing', 'bundles', '🏠', 70),
  ('roofing_felt', 'Roofing Felt', 'Manta Asfaltica', 'roofing', 'rolls', '🏠', 71),
  ('other', 'Other Material', 'Outro Material', 'other', 'unit', '📦', 999)
ON CONFLICT (code) DO NOTHING;

-- RLS for ref_material_types (public read)
ALTER TABLE ref_material_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read material types"
  ON ref_material_types FOR SELECT
  USING (is_active = true);

-- ============================================
-- 2. OPERATOR ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS egl_operator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES egl_sites(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES core_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operator_id, site_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operator_assignments_operator
  ON egl_operator_assignments(operator_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_operator_assignments_site
  ON egl_operator_assignments(site_id) WHERE is_active = true;

-- RLS
ALTER TABLE egl_operator_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read operator assignments"
  ON egl_operator_assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert operator assignments"
  ON egl_operator_assignments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update operator assignments"
  ON egl_operator_assignments FOR UPDATE TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_egl_operator_assignments_updated_at
  BEFORE UPDATE ON egl_operator_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 3. MATERIAL REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS egl_material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope (organization_id can be added when multi-tenancy is implemented)
  site_id UUID NOT NULL REFERENCES egl_sites(id) ON DELETE CASCADE,
  house_id UUID REFERENCES egl_houses(id) ON DELETE SET NULL,

  -- Request Details
  material_type VARCHAR(50) NOT NULL,
  material_name VARCHAR(200) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(20) DEFAULT 'pcs',
  notes TEXT,

  -- Urgency (AI-calculated)
  urgency_level VARCHAR(20) DEFAULT 'medium' CHECK (urgency_level IN (
    'low',       -- Can wait 24+ hours
    'medium',    -- Within the day
    'high',      -- Within hours
    'critical'   -- Blocking work NOW
  )),
  urgency_score INTEGER DEFAULT 50 CHECK (urgency_score BETWEEN 0 AND 100),
  urgency_reason TEXT,
  urgency_factors JSONB DEFAULT '{}',

  -- Status Workflow
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',       -- Just created, waiting for operator
    'acknowledged',  -- Operator saw and accepted
    'in_transit',    -- Being delivered
    'delivered',     -- At the lot
    'cancelled'      -- Cancelled by requester or operator
  )),

  -- Requester Info
  requested_by_id UUID REFERENCES core_profiles(id),
  requested_by_name VARCHAR(200) NOT NULL,
  requested_by_role VARCHAR(30),

  -- Delivery Info
  acknowledged_by_id UUID REFERENCES core_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  delivered_by_id UUID REFERENCES core_profiles(id),
  delivered_by_name VARCHAR(200),
  delivered_at TIMESTAMPTZ,
  delivery_notes TEXT,
  delivery_location TEXT,

  -- Cancel Info
  cancelled_by_id UUID REFERENCES core_profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_material_requests_site_status
  ON egl_material_requests(site_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_material_requests_house
  ON egl_material_requests(house_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_material_requests_urgency
  ON egl_material_requests(urgency_score DESC, created_at ASC) WHERE deleted_at IS NULL AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_material_requests_requester
  ON egl_material_requests(requested_by_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_material_requests_operator
  ON egl_material_requests(delivered_by_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_material_requests_status
  ON egl_material_requests(status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE egl_material_requests ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (operators need to see requests from their assigned sites)
CREATE POLICY "Authenticated users can read material requests"
  ON egl_material_requests FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Anyone authenticated can create requests
CREATE POLICY "Authenticated users can create material requests"
  ON egl_material_requests FOR INSERT TO authenticated
  WITH CHECK (true);

-- Anyone authenticated can update (status transitions)
CREATE POLICY "Authenticated users can update material requests"
  ON egl_material_requests FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

-- Soft delete only - no hard delete allowed
CREATE POLICY "No hard delete on material requests"
  ON egl_material_requests FOR DELETE TO authenticated
  USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_egl_material_requests_updated_at
  BEFORE UPDATE ON egl_material_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. HELPER FUNCTION: Calculate Urgency Score
-- ============================================

CREATE OR REPLACE FUNCTION calculate_material_urgency_score(
  p_urgency_level VARCHAR,
  p_house_status VARCHAR DEFAULT NULL,
  p_house_priority INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_explicit_score INTEGER;
  v_schedule_score INTEGER;
  v_priority_score INTEGER;
  v_final_score INTEGER;
BEGIN
  -- Explicit urgency (40% weight)
  v_explicit_score := CASE p_urgency_level
    WHEN 'critical' THEN 100
    WHEN 'high' THEN 75
    WHEN 'medium' THEN 50
    WHEN 'low' THEN 25
    ELSE 50
  END;

  -- Schedule deviation based on house status (35% weight)
  v_schedule_score := CASE p_house_status
    WHEN 'delayed' THEN 90
    WHEN 'on_hold' THEN 70
    WHEN 'in_progress' THEN 50
    WHEN 'not_started' THEN 30
    WHEN 'completed' THEN 10
    ELSE 50
  END;

  -- Lot priority (25% weight)
  v_priority_score := COALESCE(p_house_priority, 50);

  -- Calculate weighted score
  v_final_score := ROUND(
    v_explicit_score * 0.40 +
    v_schedule_score * 0.35 +
    v_priority_score * 0.25
  );

  RETURN LEAST(100, GREATEST(0, v_final_score));
END;
$$;

-- ============================================
-- 5. TRIGGER: Auto-calculate urgency on insert
-- ============================================

CREATE OR REPLACE FUNCTION calculate_material_request_urgency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_house_status VARCHAR;
  v_house_priority INTEGER;
BEGIN
  -- Get house info if house_id is provided
  IF NEW.house_id IS NOT NULL THEN
    SELECT status, priority_score
    INTO v_house_status, v_house_priority
    FROM egl_houses
    WHERE id = NEW.house_id;
  END IF;

  -- Calculate urgency score
  NEW.urgency_score := calculate_material_urgency_score(
    NEW.urgency_level,
    v_house_status,
    v_house_priority
  );

  -- Build urgency factors JSON
  NEW.urgency_factors := jsonb_build_object(
    'explicit_urgency', CASE NEW.urgency_level
      WHEN 'critical' THEN 100
      WHEN 'high' THEN 75
      WHEN 'medium' THEN 50
      WHEN 'low' THEN 25
      ELSE 50
    END,
    'schedule_deviation', CASE v_house_status
      WHEN 'delayed' THEN 90
      WHEN 'on_hold' THEN 70
      WHEN 'in_progress' THEN 50
      ELSE 50
    END,
    'lot_priority', COALESCE(v_house_priority, 50)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_material_urgency
  BEFORE INSERT ON egl_material_requests
  FOR EACH ROW EXECUTE FUNCTION calculate_material_request_urgency();

-- ============================================
-- 6. VIEW: Pending requests for operators
-- ============================================

CREATE OR REPLACE VIEW v_operator_pending_requests AS
SELECT
  mr.id,
  mr.site_id,
  mr.house_id,
  mr.material_type,
  mr.material_name,
  mr.quantity,
  mr.unit,
  mr.urgency_level,
  mr.urgency_score,
  mr.urgency_reason,
  mr.status,
  mr.requested_by_name,
  mr.requested_by_role,
  mr.delivery_location,
  mr.notes,
  mr.created_at,
  -- Joined fields
  s.name AS site_name,
  h.lot_number,
  h.address AS lot_address,
  h.status AS lot_status,
  -- Time calculations
  EXTRACT(EPOCH FROM (NOW() - mr.created_at)) / 60 AS minutes_waiting
FROM egl_material_requests mr
LEFT JOIN egl_sites s ON s.id = mr.site_id
LEFT JOIN egl_houses h ON h.id = mr.house_id
WHERE mr.deleted_at IS NULL
  AND mr.status IN ('pending', 'acknowledged', 'in_transit')
ORDER BY mr.urgency_score DESC, mr.created_at ASC;

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE ref_material_types IS 'Reference table for common construction materials';
COMMENT ON TABLE egl_operator_assignments IS 'Links operators (maquinistas) to sites they serve';
COMMENT ON TABLE egl_material_requests IS 'Material delivery requests from workers/supervisors to operators';
COMMENT ON COLUMN egl_material_requests.urgency_score IS 'AI-computed score 0-100, higher = more urgent';
COMMENT ON COLUMN egl_material_requests.urgency_factors IS 'JSON breakdown: explicit_urgency, schedule_deviation, lot_priority';
COMMENT ON VIEW v_operator_pending_requests IS 'Active material requests for operator dashboard';
