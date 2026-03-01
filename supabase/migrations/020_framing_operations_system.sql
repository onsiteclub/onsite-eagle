-- ============================================================================
-- 020_framing_operations_system.sql
-- Framing Operations System: Full egl_* → frm_* migration
--
-- Source of truth: onsite-technical-spec.md
-- NO DATA TO MIGRATE — all tables dropped and recreated fresh
--
-- Architecture tables EXCLUDED (kept as egl_*):
--   egl_app_registry, egl_business_metrics, egl_data_metrics
-- ============================================================================

-- ============================================================================
-- SECTION 0: Drop FK constraints from EXTERNAL tables referencing egl_*
-- ============================================================================

-- crd_transactions → egl_houses, egl_sites
ALTER TABLE IF EXISTS crd_transactions DROP CONSTRAINT IF EXISTS crd_transactions_house_id_fkey;
ALTER TABLE IF EXISTS crd_transactions DROP CONSTRAINT IF EXISTS crd_transactions_site_id_fkey;

-- sht_exports → egl_sites
ALTER TABLE IF EXISTS sht_exports DROP CONSTRAINT IF EXISTS sht_exports_site_id_fkey;

-- sht_saved_views → egl_sites
ALTER TABLE IF EXISTS sht_saved_views DROP CONSTRAINT IF EXISTS sht_saved_views_site_id_fkey;

-- ============================================================================
-- SECTION 1: Drop triggers on egl_* tables
-- ============================================================================

DROP TRIGGER IF EXISTS update_egl_sites_updated_at ON egl_sites;
DROP TRIGGER IF EXISTS update_egl_houses_updated_at ON egl_houses;
DROP TRIGGER IF EXISTS update_egl_material_requests_updated_at ON egl_material_requests;
DROP TRIGGER IF EXISTS update_egl_schedules_updated_at ON egl_schedules;
DROP TRIGGER IF EXISTS update_egl_schedule_phases_updated_at ON egl_schedule_phases;
DROP TRIGGER IF EXISTS calculate_material_request_urgency ON egl_material_requests;

-- Also drop the urgency function
DROP FUNCTION IF EXISTS calculate_material_request_urgency_score();

-- ============================================================================
-- SECTION 2: Drop egl_* tables (CASCADE handles FK ordering)
-- Excludes: egl_app_registry, egl_business_metrics, egl_data_metrics
-- ============================================================================

DROP TABLE IF EXISTS egl_ai_reports CASCADE;
DROP TABLE IF EXISTS egl_assignments CASCADE;
DROP TABLE IF EXISTS egl_crew_members CASCADE;
DROP TABLE IF EXISTS egl_crews CASCADE;
DROP TABLE IF EXISTS egl_document_links CASCADE;
DROP TABLE IF EXISTS egl_documents CASCADE;
DROP TABLE IF EXISTS egl_document_batches CASCADE;
DROP TABLE IF EXISTS egl_external_events CASCADE;
DROP TABLE IF EXISTS egl_issues CASCADE;
DROP TABLE IF EXISTS egl_material_requests CASCADE;
DROP TABLE IF EXISTS egl_material_tracking CASCADE;
DROP TABLE IF EXISTS egl_messages CASCADE;
DROP TABLE IF EXISTS egl_operator_assignments CASCADE;
DROP TABLE IF EXISTS egl_phase_assignments CASCADE;
DROP TABLE IF EXISTS egl_phase_rates CASCADE;
DROP TABLE IF EXISTS egl_photos CASCADE;
DROP TABLE IF EXISTS egl_progress CASCADE;
DROP TABLE IF EXISTS egl_scans CASCADE;
DROP TABLE IF EXISTS egl_schedule_phases CASCADE;
DROP TABLE IF EXISTS egl_schedules CASCADE;
DROP TABLE IF EXISTS egl_site_workers CASCADE;
DROP TABLE IF EXISTS egl_timeline CASCADE;
DROP TABLE IF EXISTS egl_houses CASCADE;
DROP TABLE IF EXISTS egl_sites CASCADE;

-- ============================================================================
-- SECTION 3: Create frm_* tables (FK order)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 3.1 frm_phases — Seed table, TEXT PK (from spec section 4.2)
-- --------------------------------------------------------------------------
CREATE TABLE frm_phases (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL,
  is_backframe    BOOLEAN DEFAULT FALSE,
  is_optional     BOOLEAN DEFAULT FALSE
);

-- --------------------------------------------------------------------------
-- 3.2 frm_jobsites — (replaces egl_sites)
-- --------------------------------------------------------------------------
CREATE TABLE frm_jobsites (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  name            TEXT NOT NULL,
  builder_name    TEXT NOT NULL,
  address         TEXT,
  city            TEXT DEFAULT 'Ottawa',
  svg_data        TEXT,
  original_plan_url TEXT,
  total_lots      INTEGER DEFAULT 0,
  completed_lots  INTEGER DEFAULT 0,
  start_date      DATE,
  expected_end_date DATE,
  status          TEXT DEFAULT 'active',
  foreman_id      UUID REFERENCES core_profiles(id),
  lumberyard_notes TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.3 frm_lots — (replaces egl_houses)
-- --------------------------------------------------------------------------
CREATE TABLE frm_lots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  jobsite_id      UUID NOT NULL REFERENCES frm_jobsites(id) ON DELETE CASCADE,
  lot_number      TEXT NOT NULL,
  block           TEXT,
  model           TEXT,
  address         TEXT,
  total_sqft      NUMERIC(10,2),
  sqft_main_floors NUMERIC(10,2),
  sqft_roof       NUMERIC(10,2),
  sqft_basement   NUMERIC(10,2),
  status          TEXT DEFAULT 'pending',
  current_phase   TEXT REFERENCES frm_phases(id),
  has_capping     BOOLEAN DEFAULT FALSE,
  blueprint_url   TEXT,
  priority_score  INTEGER,
  target_date     DATE,
  closing_date    DATE,
  buyer_name      TEXT,
  buyer_contact   TEXT,
  is_sold         BOOLEAN DEFAULT FALSE,
  released_at     TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  coordinates     JSONB,
  qr_code_data    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(jobsite_id, lot_number)
);

-- --------------------------------------------------------------------------
-- 3.4 frm_crews — (replaces egl_crews)
-- --------------------------------------------------------------------------
CREATE TABLE frm_crews (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  name            TEXT NOT NULL,
  lead_id         UUID REFERENCES core_profiles(id),
  specialty       TEXT[],
  phone           TEXT,
  email           TEXT,
  wsib_number     TEXT,
  wsib_expires    DATE,
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.5 frm_crew_workers — (replaces egl_crew_members)
-- --------------------------------------------------------------------------
CREATE TABLE frm_crew_workers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  crew_id         UUID NOT NULL REFERENCES frm_crews(id) ON DELETE CASCADE,
  worker_id       UUID NOT NULL REFERENCES core_profiles(id),
  role            TEXT DEFAULT 'worker',
  employment_type TEXT DEFAULT 'subcontract',
  joined_at       TIMESTAMPTZ DEFAULT now(),
  left_at         TIMESTAMPTZ,
  UNIQUE(crew_id, worker_id)
);

-- --------------------------------------------------------------------------
-- 3.6 frm_phase_assignments — (replaces egl_phase_assignments)
-- --------------------------------------------------------------------------
CREATE TABLE frm_phase_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id) ON DELETE CASCADE,
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  crew_id         UUID NOT NULL REFERENCES frm_crews(id),
  status          TEXT DEFAULT 'assigned',
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  UNIQUE(lot_id, phase_id, crew_id)
);

-- --------------------------------------------------------------------------
-- 3.7 frm_gate_checks — NEW (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_gate_checks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  transition      TEXT NOT NULL,
  checked_by      UUID NOT NULL REFERENCES core_profiles(id),
  status          TEXT DEFAULT 'in_progress',
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  released_at     TIMESTAMPTZ
);

-- --------------------------------------------------------------------------
-- 3.8 frm_house_items — Documento Vivo (replaces egl_issues)
-- --------------------------------------------------------------------------
CREATE TABLE frm_house_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT REFERENCES frm_phases(id),
  crew_id         UUID REFERENCES frm_crews(id),
  type            TEXT NOT NULL,
  severity        TEXT DEFAULT 'medium',
  title           TEXT NOT NULL,
  description     TEXT,
  photo_url       TEXT NOT NULL,
  reported_by     UUID NOT NULL REFERENCES core_profiles(id),
  reported_at     TIMESTAMPTZ DEFAULT now(),
  status          TEXT DEFAULT 'open',
  blocking        BOOLEAN DEFAULT FALSE,
  resolved_by     UUID REFERENCES core_profiles(id),
  resolved_at     TIMESTAMPTZ,
  resolved_photo  TEXT,
  resolution_note TEXT,
  gate_check_id   UUID REFERENCES frm_gate_checks(id)
);

-- --------------------------------------------------------------------------
-- 3.9 frm_gate_check_items — NEW (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_gate_check_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gate_check_id   UUID NOT NULL REFERENCES frm_gate_checks(id) ON DELETE CASCADE,
  item_code       TEXT NOT NULL,
  item_label      TEXT NOT NULL,
  result          TEXT DEFAULT 'pending',
  photo_url       TEXT,
  notes           TEXT,
  deficiency_id   UUID REFERENCES frm_house_items(id)
);

-- --------------------------------------------------------------------------
-- 3.10 frm_gate_check_templates — NEW seed table (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_gate_check_templates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transition      TEXT NOT NULL,
  item_code       TEXT NOT NULL,
  item_label      TEXT NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  is_blocking     BOOLEAN DEFAULT TRUE,
  UNIQUE(transition, item_code)
);

-- --------------------------------------------------------------------------
-- 3.11 frm_phase_payments — (replaces egl_phase_rates)
-- --------------------------------------------------------------------------
CREATE TABLE frm_phase_payments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  crew_id         UUID NOT NULL REFERENCES frm_crews(id),
  sqft            NUMERIC(10,2) NOT NULL,
  rate_per_sqft   NUMERIC(8,4) NOT NULL,
  total           NUMERIC(12,2) GENERATED ALWAYS AS (sqft * rate_per_sqft) STORED,
  status          TEXT DEFAULT 'unpaid',
  approved_by     UUID REFERENCES core_profiles(id),
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  deductions      NUMERIC(10,2) DEFAULT 0,
  extras          NUMERIC(10,2) DEFAULT 0,
  final_amount    NUMERIC(12,2) GENERATED ALWAYS AS (sqft * rate_per_sqft - COALESCE(deductions, 0) + COALESCE(extras, 0)) STORED,
  notes           TEXT,
  UNIQUE(lot_id, phase_id, crew_id)
);

-- --------------------------------------------------------------------------
-- 3.12 frm_material_requests — (replaces egl_material_requests)
-- Merged: spec schema + existing urgency scoring from Operator app
-- --------------------------------------------------------------------------
CREATE TABLE frm_material_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  jobsite_id      UUID REFERENCES frm_jobsites(id),
  -- Request fields
  material_type   VARCHAR(50),
  material_name   VARCHAR(200),
  quantity        NUMERIC(10,2),
  unit            VARCHAR(20) DEFAULT 'pcs',
  notes           TEXT,
  -- Urgency scoring (from Operator app)
  urgency_level   VARCHAR(20) DEFAULT 'medium',
  urgency_score   INTEGER DEFAULT 50,
  urgency_reason  TEXT,
  urgency_factors JSONB DEFAULT '{}'::jsonb,
  -- People
  requested_by    UUID NOT NULL REFERENCES core_profiles(id),
  requested_by_name VARCHAR(200),
  authorized_by   UUID REFERENCES core_profiles(id),
  authorized_at   TIMESTAMPTZ,
  operator_id     UUID REFERENCES core_profiles(id),
  -- Delivery workflow
  status          TEXT DEFAULT 'requested',
  requested_at    TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  in_transit_at   TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  delivered_by_id UUID REFERENCES core_profiles(id),
  delivered_by_name VARCHAR(200),
  delivery_notes  TEXT,
  delivery_location TEXT,
  -- Cancellation
  cancelled_by_id UUID REFERENCES core_profiles(id),
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- --------------------------------------------------------------------------
-- 3.13 frm_equipment_requests — NEW (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_equipment_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  requested_by    UUID NOT NULL REFERENCES core_profiles(id),
  operator_id     UUID REFERENCES core_profiles(id),
  operation_type  TEXT NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'requested',
  priority        TEXT DEFAULT 'normal',
  requested_at    TIMESTAMPTZ DEFAULT now(),
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

-- --------------------------------------------------------------------------
-- 3.14 frm_warnings — NEW (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_warnings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID REFERENCES frm_lots(id),
  target_type     TEXT NOT NULL,
  target_id       UUID,
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  sent_by         UUID REFERENCES core_profiles(id),
  priority        TEXT DEFAULT 'warning',
  persistent      BOOLEAN DEFAULT TRUE,
  dismissable     BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'active',
  resolved_by     UUID REFERENCES core_profiles(id),
  resolved_at     TIMESTAMPTZ,
  resolved_proof  TEXT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.15 frm_certifications — NEW (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_certifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  worker_id       UUID NOT NULL REFERENCES core_profiles(id),
  cert_type       TEXT NOT NULL,
  cert_number     TEXT,
  issued_at       DATE,
  expires_at      DATE,
  document_url    TEXT,
  verified_by     UUID REFERENCES core_profiles(id),
  verified_at     TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.16 frm_safety_checks — NEW (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_safety_checks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT REFERENCES frm_phases(id),
  type            TEXT NOT NULL,
  status          TEXT DEFAULT 'open',
  blocking        BOOLEAN DEFAULT TRUE,
  reported_by     UUID NOT NULL REFERENCES core_profiles(id),
  photo_url       TEXT NOT NULL,
  description     TEXT,
  resolved_by     UUID REFERENCES core_profiles(id),
  resolved_at     TIMESTAMPTZ,
  resolved_photo  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.17 frm_trade_pauses — NEW (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_trade_pauses (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  started_at      TIMESTAMPTZ NOT NULL,
  expected_end    TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  trades_in       TEXT[],
  notes           TEXT
);

-- --------------------------------------------------------------------------
-- 3.18 frm_third_party_entries — NEW (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_third_party_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT REFERENCES frm_phases(id),
  company         TEXT NOT NULL,
  purpose         TEXT NOT NULL,
  entered_at      TIMESTAMPTZ DEFAULT now(),
  exited_at       TIMESTAMPTZ,
  authorized_by   UUID REFERENCES core_profiles(id),
  notes           TEXT
);

-- --------------------------------------------------------------------------
-- 3.19 frm_return_visits — NEW (from spec)
-- --------------------------------------------------------------------------
CREATE TABLE frm_return_visits (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  crew_id         UUID REFERENCES frm_crews(id),
  reason          TEXT NOT NULL,
  requested_by    UUID REFERENCES core_profiles(id),
  assigned_to     UUID REFERENCES core_profiles(id),
  status          TEXT DEFAULT 'pending',
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  photo_before    TEXT,
  photo_after     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.20 frm_photos — (replaces egl_photos, phase_id now TEXT)
-- --------------------------------------------------------------------------
CREATE TABLE frm_photos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT REFERENCES frm_phases(id),
  uploaded_by     UUID REFERENCES core_profiles(id),
  photo_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  photo_type      VARCHAR(30),
  ai_validation_status VARCHAR(20) DEFAULT 'pending',
  ai_validation_notes TEXT,
  ai_detected_items JSONB DEFAULT '[]'::jsonb,
  ai_confidence   NUMERIC(4,3),
  metadata        JSONB,
  quality_score   FLOAT,
  is_training_eligible BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.21 frm_timeline — (replaces egl_timeline)
-- --------------------------------------------------------------------------
CREATE TABLE frm_timeline (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  event_type      VARCHAR(30) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  source          VARCHAR(30),
  source_link     TEXT,
  metadata        JSONB,
  created_by      UUID REFERENCES core_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.22 frm_progress — (replaces egl_progress, phase_id now TEXT)
-- --------------------------------------------------------------------------
CREATE TABLE frm_progress (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  status          VARCHAR(20) DEFAULT 'pending',
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES core_profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lot_id, phase_id)
);

-- --------------------------------------------------------------------------
-- 3.23 frm_documents — (replaces egl_documents)
-- --------------------------------------------------------------------------
CREATE TABLE frm_documents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  jobsite_id      UUID REFERENCES frm_jobsites(id),
  lot_id          UUID REFERENCES frm_lots(id),
  name            VARCHAR(255) NOT NULL,
  file_url        TEXT NOT NULL,
  file_path       TEXT,
  file_type       VARCHAR(50),
  file_size       BIGINT,
  category        VARCHAR(50) DEFAULT 'other',
  description     TEXT,
  ai_analyzed     BOOLEAN DEFAULT FALSE,
  ai_summary      TEXT,
  ai_extracted_data JSONB,
  uploaded_by     UUID REFERENCES core_profiles(id),
  parsed_lot_number VARCHAR(50),
  parsing_confidence NUMERIC(3,2),
  batch_id        UUID,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.24 frm_document_batches — (replaces egl_document_batches)
-- --------------------------------------------------------------------------
CREATE TABLE frm_document_batches (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  jobsite_id      UUID NOT NULL REFERENCES frm_jobsites(id),
  status          VARCHAR(30) DEFAULT 'processing',
  total_files     INTEGER DEFAULT 0,
  processed_files INTEGER DEFAULT 0,
  linked_files    INTEGER DEFAULT 0,
  unlinked_files  INTEGER DEFAULT 0,
  failed_files    INTEGER DEFAULT 0,
  uploaded_by     UUID REFERENCES core_profiles(id),
  uploaded_by_name VARCHAR(200),
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Add FK from frm_documents.batch_id to frm_document_batches
ALTER TABLE frm_documents ADD CONSTRAINT frm_documents_batch_id_fkey
  FOREIGN KEY (batch_id) REFERENCES frm_document_batches(id);

-- --------------------------------------------------------------------------
-- 3.25 frm_document_links — (replaces egl_document_links)
-- --------------------------------------------------------------------------
CREATE TABLE frm_document_links (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  document_id     UUID NOT NULL REFERENCES frm_documents(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  link_type       VARCHAR(30) DEFAULT 'auto_parsed',
  show_in_timeline BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES core_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.26 frm_messages — (replaces egl_messages)
-- --------------------------------------------------------------------------
CREATE TABLE frm_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  jobsite_id      UUID NOT NULL REFERENCES frm_jobsites(id),
  lot_id          UUID REFERENCES frm_lots(id),
  sender_type     TEXT NOT NULL,
  sender_id       UUID REFERENCES core_profiles(id),
  sender_name     TEXT NOT NULL,
  sender_avatar_url TEXT,
  content         TEXT NOT NULL,
  attachments     JSONB DEFAULT '[]'::jsonb,
  is_ai_response  BOOLEAN DEFAULT FALSE,
  ai_question     TEXT,
  ai_context      JSONB,
  ai_model        TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  reply_to_id     UUID REFERENCES frm_messages(id),
  phase_at_creation INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- --------------------------------------------------------------------------
-- 3.27 frm_schedules — (replaces egl_schedules)
-- --------------------------------------------------------------------------
CREATE TABLE frm_schedules (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  jobsite_id      UUID REFERENCES frm_jobsites(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  template_name   VARCHAR(100),
  template_version INTEGER DEFAULT 1,
  expected_start_date DATE NOT NULL,
  expected_end_date DATE NOT NULL,
  expected_duration_days INTEGER,
  actual_start_date DATE,
  actual_end_date DATE,
  actual_duration_days INTEGER,
  status          VARCHAR(30) DEFAULT 'scheduled',
  deviation_days  INTEGER DEFAULT 0,
  deviation_reason TEXT,
  assigned_worker_id UUID REFERENCES core_profiles(id),
  assigned_worker_name VARCHAR(200),
  ai_risk_score   NUMERIC(4,3),
  ai_predicted_end_date DATE,
  ai_last_analyzed_at TIMESTAMPTZ,
  ai_analysis_notes TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.28 frm_schedule_phases — (replaces egl_schedule_phases, phase_id TEXT)
-- --------------------------------------------------------------------------
CREATE TABLE frm_schedule_phases (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  schedule_id     UUID NOT NULL REFERENCES frm_schedules(id) ON DELETE CASCADE,
  phase_id        TEXT NOT NULL REFERENCES frm_phases(id),
  expected_start_date DATE,
  expected_end_date DATE,
  expected_duration_days INTEGER,
  actual_start_date DATE,
  actual_end_date DATE,
  actual_duration_days INTEGER,
  status          VARCHAR(20) DEFAULT 'pending',
  blocked_reason  TEXT,
  blocked_since   TIMESTAMPTZ,
  payment_status  VARCHAR(30) DEFAULT 'not_due',
  payment_approved_at TIMESTAMPTZ,
  payment_approved_by UUID REFERENCES core_profiles(id),
  payment_exported_at TIMESTAMPTZ,
  payment_notes   TEXT,
  depends_on_phases UUID[],
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.29 frm_external_events — (replaces egl_external_events)
-- --------------------------------------------------------------------------
CREATE TABLE frm_external_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  jobsite_id      UUID REFERENCES frm_jobsites(id),
  lot_id          UUID REFERENCES frm_lots(id),
  event_type      VARCHAR(50) DEFAULT 'other' NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  event_date      DATE NOT NULL,
  source          VARCHAR(50),
  impact_severity VARCHAR(20) DEFAULT 'none',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.30 frm_scans — (replaces egl_scans)
-- --------------------------------------------------------------------------
CREATE TABLE frm_scans (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  jobsite_id      UUID NOT NULL REFERENCES frm_jobsites(id),
  original_url    TEXT NOT NULL,
  file_type       VARCHAR(10),
  ai_processed    BOOLEAN DEFAULT FALSE,
  ai_result       JSONB,
  generated_svg   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.31 frm_site_workers — (replaces egl_site_workers)
-- --------------------------------------------------------------------------
CREATE TABLE frm_site_workers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  jobsite_id      UUID NOT NULL REFERENCES frm_jobsites(id),
  worker_id       UUID NOT NULL REFERENCES core_profiles(id),
  worker_name     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  assigned_by     UUID REFERENCES core_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.32 frm_operator_assignments — (replaces egl_operator_assignments)
-- --------------------------------------------------------------------------
CREATE TABLE frm_operator_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  operator_id     UUID NOT NULL REFERENCES core_profiles(id),
  jobsite_id      UUID NOT NULL REFERENCES frm_jobsites(id),
  is_active       BOOLEAN DEFAULT TRUE,
  is_available    BOOLEAN DEFAULT TRUE,
  available_since TIMESTAMPTZ,
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  assigned_by     UUID REFERENCES core_profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.33 frm_ai_reports — (replaces egl_ai_reports)
-- --------------------------------------------------------------------------
CREATE TABLE frm_ai_reports (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  jobsite_id      UUID NOT NULL REFERENCES frm_jobsites(id),
  lot_id          UUID REFERENCES frm_lots(id),
  report_type     TEXT NOT NULL,
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL,
  full_report     TEXT NOT NULL,
  sections        JSONB DEFAULT '[]'::jsonb,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  metrics         JSONB DEFAULT '{}'::jsonb NOT NULL,
  highlights      JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  ai_model        TEXT,
  ai_confidence   NUMERIC(3,2),
  generation_time_ms INTEGER,
  status          TEXT DEFAULT 'generated' NOT NULL,
  reviewed_by     UUID REFERENCES core_profiles(id),
  reviewed_at     TIMESTAMPTZ,
  sent_to         JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- --------------------------------------------------------------------------
-- 3.34 frm_assignments — (replaces egl_assignments)
-- --------------------------------------------------------------------------
CREATE TABLE frm_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  worker_id       UUID NOT NULL REFERENCES core_profiles(id),
  assigned_by     UUID REFERENCES core_profiles(id),
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  expected_start_date DATE,
  expected_end_date DATE,
  status          VARCHAR(20) DEFAULT 'pending' NOT NULL,
  plan_urls       TEXT[],
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3.35 frm_material_tracking — (replaces egl_material_tracking)
-- --------------------------------------------------------------------------
CREATE TABLE frm_material_tracking (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES core_organizations(id),
  lot_id          UUID NOT NULL REFERENCES frm_lots(id),
  jobsite_id      UUID REFERENCES frm_jobsites(id),
  phase_id        TEXT REFERENCES frm_phases(id),
  material_type   VARCHAR(50) NOT NULL,
  material_subtype VARCHAR(50),
  description     TEXT,
  quantity        INTEGER DEFAULT 1 NOT NULL,
  unit            VARCHAR(20) DEFAULT 'unit',
  length_inches   NUMERIC(8,2),
  status          VARCHAR(20) DEFAULT 'needed' NOT NULL,
  ordered_at      TIMESTAMPTZ,
  ordered_by      UUID REFERENCES core_profiles(id),
  delivered_at    TIMESTAMPTZ,
  installed_at    TIMESTAMPTZ,
  installed_by    UUID REFERENCES core_profiles(id),
  welded_at       TIMESTAMPTZ,
  verified_at     TIMESTAMPTZ,
  verified_by     UUID REFERENCES core_profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- SECTION 4: Enable RLS + Create policies
-- ============================================================================

-- 4.0 frm_phases — public read (seed/reference)
ALTER TABLE frm_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phases_select" ON frm_phases FOR SELECT TO authenticated USING (true);

-- 4.1 frm_gate_check_templates — public read (seed/reference)
ALTER TABLE frm_gate_check_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_select" ON frm_gate_check_templates FOR SELECT TO authenticated USING (true);

-- Org-based RLS for all other frm_* tables
-- Pattern: organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL

ALTER TABLE frm_jobsites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_jobsites FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_jobsites FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_jobsites FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_jobsites FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_lots FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_lots FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_lots FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_lots FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_crews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_crews FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_crews FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_crews FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_crews FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_crew_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_crew_workers FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_crew_workers FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_crew_workers FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_crew_workers FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_phase_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_phase_assignments FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_phase_assignments FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_phase_assignments FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_phase_assignments FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_gate_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_gate_checks FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_gate_checks FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_gate_checks FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_gate_checks FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_house_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_house_items FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_house_items FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_house_items FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_house_items FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_gate_check_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select" ON frm_gate_check_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM frm_gate_checks gc WHERE gc.id = gate_check_id AND (gc.organization_id IN (SELECT get_user_organization_ids()) OR gc.organization_id IS NULL)));
CREATE POLICY "items_insert" ON frm_gate_check_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM frm_gate_checks gc WHERE gc.id = gate_check_id AND (gc.organization_id IN (SELECT get_user_organization_ids()) OR gc.organization_id IS NULL)));
CREATE POLICY "items_update" ON frm_gate_check_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM frm_gate_checks gc WHERE gc.id = gate_check_id AND (gc.organization_id IN (SELECT get_user_organization_ids()) OR gc.organization_id IS NULL)));
CREATE POLICY "items_delete" ON frm_gate_check_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM frm_gate_checks gc WHERE gc.id = gate_check_id AND (gc.organization_id IN (SELECT get_user_organization_ids()) OR gc.organization_id IS NULL)));

ALTER TABLE frm_phase_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_phase_payments FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_phase_payments FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_phase_payments FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_phase_payments FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_material_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_material_requests FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_material_requests FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_material_requests FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_material_requests FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_equipment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_equipment_requests FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_equipment_requests FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_equipment_requests FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_equipment_requests FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_warnings FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_warnings FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_warnings FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_warnings FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_certifications FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_certifications FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_certifications FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_certifications FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_safety_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_safety_checks FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_safety_checks FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_safety_checks FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_safety_checks FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_trade_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_trade_pauses FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_trade_pauses FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_trade_pauses FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_trade_pauses FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_third_party_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_third_party_entries FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_third_party_entries FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_third_party_entries FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_third_party_entries FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_return_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_return_visits FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_return_visits FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_return_visits FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_return_visits FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_photos FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_photos FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_photos FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_photos FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_timeline FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_timeline FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_timeline FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_timeline FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_progress FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_progress FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_progress FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_progress FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_documents FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_documents FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_documents FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_documents FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_document_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_document_batches FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_document_batches FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_document_batches FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_document_batches FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_document_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_document_links FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_document_links FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_document_links FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_document_links FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_messages FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_messages FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_messages FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_messages FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_schedules FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_schedules FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_schedules FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_schedules FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_schedule_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_schedule_phases FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_schedule_phases FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_schedule_phases FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_schedule_phases FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_external_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_external_events FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_external_events FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_external_events FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_external_events FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_scans FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_scans FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_scans FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_scans FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_site_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_site_workers FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_site_workers FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_site_workers FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_site_workers FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_operator_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_operator_assignments FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_operator_assignments FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_operator_assignments FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_operator_assignments FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_ai_reports FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_ai_reports FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_ai_reports FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_ai_reports FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_assignments FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_assignments FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_assignments FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_assignments FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);

ALTER TABLE frm_material_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON frm_material_tracking FOR SELECT TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_insert" ON frm_material_tracking FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_update" ON frm_material_tracking FOR UPDATE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);
CREATE POLICY "org_delete" ON frm_material_tracking FOR DELETE TO authenticated USING (organization_id IN (SELECT get_user_organization_ids()) OR organization_id IS NULL);


-- ============================================================================
-- SECTION 5: Indexes
-- ============================================================================

-- Core lookup indexes
CREATE INDEX idx_frm_lots_jobsite ON frm_lots(jobsite_id);
CREATE INDEX idx_frm_lots_status ON frm_lots(status);
CREATE INDEX idx_frm_lots_current_phase ON frm_lots(current_phase);
CREATE INDEX idx_frm_crew_workers_crew ON frm_crew_workers(crew_id);
CREATE INDEX idx_frm_crew_workers_worker ON frm_crew_workers(worker_id);
CREATE INDEX idx_frm_phase_assignments_lot ON frm_phase_assignments(lot_id);
CREATE INDEX idx_frm_phase_assignments_crew ON frm_phase_assignments(crew_id);
CREATE INDEX idx_frm_phase_assignments_phase ON frm_phase_assignments(phase_id);

-- House items (documento vivo)
CREATE INDEX idx_frm_house_items_lot ON frm_house_items(lot_id);
CREATE INDEX idx_frm_house_items_status ON frm_house_items(status);
CREATE INDEX idx_frm_house_items_crew ON frm_house_items(crew_id);
CREATE INDEX idx_frm_house_items_type ON frm_house_items(type);
CREATE INDEX idx_frm_house_items_blocking ON frm_house_items(blocking) WHERE blocking = TRUE;

-- Gate checks
CREATE INDEX idx_frm_gate_checks_lot ON frm_gate_checks(lot_id);
CREATE INDEX idx_frm_gate_check_items_gc ON frm_gate_check_items(gate_check_id);

-- Payments
CREATE INDEX idx_frm_phase_payments_lot ON frm_phase_payments(lot_id);
CREATE INDEX idx_frm_phase_payments_crew ON frm_phase_payments(crew_id);
CREATE INDEX idx_frm_phase_payments_status ON frm_phase_payments(status);

-- Material & equipment
CREATE INDEX idx_frm_material_requests_lot ON frm_material_requests(lot_id);
CREATE INDEX idx_frm_material_requests_status ON frm_material_requests(status);
CREATE INDEX idx_frm_material_requests_operator ON frm_material_requests(operator_id);
CREATE INDEX idx_frm_equipment_requests_lot ON frm_equipment_requests(lot_id);
CREATE INDEX idx_frm_equipment_requests_operator ON frm_equipment_requests(operator_id);
CREATE INDEX idx_frm_equipment_requests_status ON frm_equipment_requests(status);

-- Warnings & safety
CREATE INDEX idx_frm_warnings_status ON frm_warnings(status) WHERE status = 'active';
CREATE INDEX idx_frm_warnings_target ON frm_warnings(target_type, target_id);
CREATE INDEX idx_frm_safety_checks_lot ON frm_safety_checks(lot_id);
CREATE INDEX idx_frm_safety_checks_status ON frm_safety_checks(status) WHERE status = 'open';
CREATE INDEX idx_frm_certifications_worker ON frm_certifications(worker_id);
CREATE INDEX idx_frm_certifications_expires ON frm_certifications(expires_at);

-- Carried-over tables
CREATE INDEX idx_frm_photos_lot ON frm_photos(lot_id);
CREATE INDEX idx_frm_timeline_lot ON frm_timeline(lot_id);
CREATE INDEX idx_frm_progress_lot ON frm_progress(lot_id);
CREATE INDEX idx_frm_documents_jobsite ON frm_documents(jobsite_id);
CREATE INDEX idx_frm_documents_lot ON frm_documents(lot_id);
CREATE INDEX idx_frm_messages_jobsite ON frm_messages(jobsite_id);
CREATE INDEX idx_frm_messages_lot ON frm_messages(lot_id);
CREATE INDEX idx_frm_schedules_lot ON frm_schedules(lot_id);
CREATE INDEX idx_frm_schedule_phases_schedule ON frm_schedule_phases(schedule_id);
CREATE INDEX idx_frm_external_events_jobsite ON frm_external_events(jobsite_id);
CREATE INDEX idx_frm_scans_jobsite ON frm_scans(jobsite_id);
CREATE INDEX idx_frm_site_workers_jobsite ON frm_site_workers(jobsite_id);
CREATE INDEX idx_frm_operator_assignments_jobsite ON frm_operator_assignments(jobsite_id);
CREATE INDEX idx_frm_operator_assignments_operator ON frm_operator_assignments(operator_id);
CREATE INDEX idx_frm_ai_reports_jobsite ON frm_ai_reports(jobsite_id);
CREATE INDEX idx_frm_assignments_lot ON frm_assignments(lot_id);
CREATE INDEX idx_frm_material_tracking_lot ON frm_material_tracking(lot_id);
CREATE INDEX idx_frm_material_tracking_jobsite ON frm_material_tracking(jobsite_id);

-- Organization indexes (for RLS performance)
CREATE INDEX idx_frm_jobsites_org ON frm_jobsites(organization_id);
CREATE INDEX idx_frm_lots_org ON frm_lots(organization_id);
CREATE INDEX idx_frm_crews_org ON frm_crews(organization_id);
CREATE INDEX idx_frm_house_items_org ON frm_house_items(organization_id);
CREATE INDEX idx_frm_material_requests_org ON frm_material_requests(organization_id);
CREATE INDEX idx_frm_warnings_org ON frm_warnings(organization_id);


-- ============================================================================
-- SECTION 6: Triggers (update_updated_at)
-- ============================================================================

CREATE TRIGGER update_frm_jobsites_updated_at BEFORE UPDATE ON frm_jobsites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_lots_updated_at BEFORE UPDATE ON frm_lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_progress_updated_at BEFORE UPDATE ON frm_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_documents_updated_at BEFORE UPDATE ON frm_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_schedules_updated_at BEFORE UPDATE ON frm_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_schedule_phases_updated_at BEFORE UPDATE ON frm_schedule_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_material_requests_updated_at BEFORE UPDATE ON frm_material_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_site_workers_updated_at BEFORE UPDATE ON frm_site_workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_operator_assignments_updated_at BEFORE UPDATE ON frm_operator_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_assignments_updated_at BEFORE UPDATE ON frm_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_frm_material_tracking_updated_at BEFORE UPDATE ON frm_material_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- SECTION 7: Seed data
-- ============================================================================

-- 7.1 frm_phases — 9 construction phases
INSERT INTO frm_phases (id, name, description, sort_order, is_backframe, is_optional) VALUES
  ('capping',             'Capping',             'Cobertura de fundação (inverno)',            0, false, true),
  ('floor_1',             'First Floor',         'Piso térreo',                                1, false, false),
  ('walls_1',             'First Floor Walls',   'Paredes térreo',                             2, false, false),
  ('floor_2',             'Second Floor',        'Piso superior',                              3, false, false),
  ('walls_2',             'Second Floor Walls',  'Paredes 2º andar',                           4, false, false),
  ('roof',                'Roof',                'Telhado',                                    5, false, false),
  ('backframe_basement',  'Backframe Basement',  'Backframe porão',                            6, true,  false),
  ('backframe_strapping', 'Backframe Strapping', 'Strapping',                                  7, true,  false),
  ('backframe_backing',   'Backframe Backing',   'Backing, escadas, fireplaces, limpeza',      8, true,  false);

-- 7.2 frm_gate_check_templates — framing_to_roofing (11 items)
-- Only this template seeded now. 3 more templates TBD:
--   roofing_to_trades, trades_to_backframe, backframe_to_final
INSERT INTO frm_gate_check_templates (transition, item_code, item_label, sort_order) VALUES
  ('framing_to_roofing', 'joist_clearance',  'Joist livre para encanamento',    1),
  ('framing_to_roofing', 'window_size',      'Tamanho de janelas confere',      2),
  ('framing_to_roofing', 'landing_size',     'Landing de escada nas medidas',   3),
  ('framing_to_roofing', 'stair_opening',    'Buraco de escada correto',        4),
  ('framing_to_roofing', 'kitchen_wall',     'Parede de cozinha nas medidas',   5),
  ('framing_to_roofing', 'level_square',     'Nível e esquadro OK',             6),
  ('framing_to_roofing', 'stud_spacing',     'Espaçamento de studs correto',    7),
  ('framing_to_roofing', 'temp_safety',      'Safety temporários no lugar',     8),
  ('framing_to_roofing', 'cleanup',          'Área limpa e organizada',         9),
  ('framing_to_roofing', 'point_loads',      'Point loads corretos',           10),
  ('framing_to_roofing', 'door_plate',       'Plate de porta cortado',         11);


-- ============================================================================
-- SECTION 8: Re-add FK constraints on external tables
-- ============================================================================

-- crd_transactions → frm_lots, frm_jobsites (rename columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crd_transactions' AND column_name = 'site_id') THEN
    ALTER TABLE crd_transactions RENAME COLUMN site_id TO jobsite_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crd_transactions' AND column_name = 'house_id') THEN
    ALTER TABLE crd_transactions RENAME COLUMN house_id TO lot_id;
  END IF;
END $$;

ALTER TABLE crd_transactions ADD CONSTRAINT crd_transactions_jobsite_id_fkey
  FOREIGN KEY (jobsite_id) REFERENCES frm_jobsites(id);
ALTER TABLE crd_transactions ADD CONSTRAINT crd_transactions_lot_id_fkey
  FOREIGN KEY (lot_id) REFERENCES frm_lots(id);

-- sht_exports → frm_jobsites (rename column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sht_exports' AND column_name = 'site_id') THEN
    ALTER TABLE sht_exports RENAME COLUMN site_id TO jobsite_id;
  END IF;
END $$;

ALTER TABLE sht_exports ADD CONSTRAINT sht_exports_jobsite_id_fkey
  FOREIGN KEY (jobsite_id) REFERENCES frm_jobsites(id);

-- sht_saved_views → frm_jobsites (rename column)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sht_saved_views' AND column_name = 'site_id') THEN
    ALTER TABLE sht_saved_views RENAME COLUMN site_id TO jobsite_id;
  END IF;
END $$;

ALTER TABLE sht_saved_views ADD CONSTRAINT sht_saved_views_jobsite_id_fkey
  FOREIGN KEY (jobsite_id) REFERENCES frm_jobsites(id);

-- tmk_geofences.site_id → frm_jobsites (update FK target)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tmk_geofences_site_id_fkey' AND table_name = 'tmk_geofences') THEN
    ALTER TABLE tmk_geofences DROP CONSTRAINT tmk_geofences_site_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tmk_geofences' AND column_name = 'site_id') THEN
    ALTER TABLE tmk_geofences ADD CONSTRAINT tmk_geofences_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES frm_jobsites(id);
  END IF;
END $$;


-- ============================================================================
-- SECTION 9: Storage bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('frm-media', 'frm-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for frm-media
CREATE POLICY "frm_media_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'frm-media');
CREATE POLICY "frm_media_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'frm-media');
CREATE POLICY "frm_media_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'frm-media');
CREATE POLICY "frm_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'frm-media');


-- ============================================================================
-- SECTION 10: Enable realtime for key tables
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE frm_warnings;
ALTER PUBLICATION supabase_realtime ADD TABLE frm_material_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE frm_equipment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE frm_safety_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE frm_house_items;
ALTER PUBLICATION supabase_realtime ADD TABLE frm_messages;
