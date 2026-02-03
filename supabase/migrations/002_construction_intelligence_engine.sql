-- ============================================================================
-- Migration: Construction Intelligence Engine
-- ============================================================================
-- Author: Cerbero (Guardian of Supabase)
-- Date: 2026-02-01
-- Description: Complete intelligence layer for proactive AI suggestions
--
-- ARCHITECTURE OVERVIEW:
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │                   CONSTRUCTION INTELLIGENCE ENGINE                       │
-- │                                                                          │
-- │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
-- │  │  KNOWLEDGE  │  │ OBSERVATION │  │  ANALYSIS   │  │   ACTION    │   │
-- │  │   LAYER     │  │    LAYER    │  │    LAYER    │  │   LAYER     │   │
-- │  │             │  │             │  │             │  │             │   │
-- │  │ - Schedules │  │ - Events    │  │ - Delays    │  │ - Reports   │   │
-- │  │ - Workers   │  │ - Progress  │  │ - Root Cause│  │ - Alerts    │   │
-- │  │ - Lots      │  │ - Photos    │  │ - Patterns  │  │ - Contests  │   │
-- │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
-- │                                                                          │
-- │  Memory Layer: int_worker_profiles, int_lot_profiles (learns over time) │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- TABLES CREATED:
--   egl_schedules           - House schedule with expected timeline
--   egl_schedule_phases     - Phase-level schedule details
--   egl_external_events     - Weather, holidays, inspector visits
--   int_worker_profiles     - Worker performance memory
--   int_lot_profiles        - Lot difficulty memory
--   int_delay_attributions  - Root cause analysis
--   int_ai_reports          - Generated intelligence reports
--   int_ai_contestations    - User feedback on AI conclusions
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: KNOWLEDGE LAYER - Schedules
-- ============================================================================

-- egl_schedules: Master schedule for each house
CREATE TABLE egl_schedules (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,

  -- Template info (which schedule template was used)
  template_name VARCHAR(100),
  template_version INTEGER DEFAULT 1,

  -- Expected timeline
  expected_start_date DATE NOT NULL,
  expected_end_date DATE NOT NULL,
  expected_duration_days INTEGER GENERATED ALWAYS AS
    (expected_end_date - expected_start_date) STORED,

  -- Actual timeline (updated as work progresses)
  actual_start_date DATE,
  actual_end_date DATE,
  actual_duration_days INTEGER,

  -- Status tracking
  status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',      -- Not started yet
    'in_progress',    -- Work ongoing
    'on_track',       -- Ahead or on schedule
    'at_risk',        -- Minor delays, recoverable
    'delayed',        -- Significant delays
    'completed',      -- Work finished
    'on_hold'         -- Paused
  )),

  -- Deviation tracking
  deviation_days INTEGER DEFAULT 0,  -- Positive = behind, negative = ahead
  deviation_reason TEXT,

  -- Worker assignment
  assigned_worker_id UUID REFERENCES core_profiles(id),
  assigned_worker_name VARCHAR(200),

  -- AI analysis
  ai_risk_score NUMERIC(4,3),  -- 0.000 to 1.000 (probability of delay)
  ai_predicted_end_date DATE,
  ai_last_analyzed_at TIMESTAMPTZ,
  ai_analysis_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(house_id)
);

-- egl_schedule_phases: Phase-level schedule details
CREATE TABLE egl_schedule_phases (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES egl_schedules(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES ref_eagle_phases(id),

  -- Expected timeline for this phase
  expected_start_date DATE NOT NULL,
  expected_end_date DATE NOT NULL,
  expected_duration_days INTEGER GENERATED ALWAYS AS
    (expected_end_date - expected_start_date) STORED,

  -- Actual timeline
  actual_start_date DATE,
  actual_end_date DATE,
  actual_duration_days INTEGER,

  -- Status
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',        -- Not started
    'in_progress',    -- Work ongoing
    'blocked',        -- Waiting on something
    'inspection',     -- Waiting for inspection
    'completed',      -- Done
    'skipped'         -- Not applicable for this house
  )),

  -- Blocking info
  blocked_reason VARCHAR(200),
  blocked_since TIMESTAMPTZ,

  -- Dependencies (which phases must complete first)
  depends_on_phases UUID[],

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(schedule_id, phase_id)
);

-- ============================================================================
-- SECTION 2: OBSERVATION LAYER - External Events
-- ============================================================================

-- egl_external_events: Events that affect work (weather, holidays, etc.)
CREATE TABLE egl_external_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Scope (site-wide or house-specific)
  site_id UUID REFERENCES egl_sites(id) ON DELETE CASCADE,
  house_id UUID REFERENCES egl_houses(id) ON DELETE CASCADE,

  -- Event type
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    -- Weather events
    'weather_snow',
    'weather_rain',
    'weather_extreme_cold',
    'weather_extreme_heat',
    'weather_wind',

    -- Administrative events
    'holiday',
    'permit_delay',
    'inspection_scheduled',
    'inspection_failed',
    'inspection_passed',

    -- Supply chain
    'material_delay',
    'material_shortage',
    'material_delivered',

    -- Labor events
    'worker_sick',
    'worker_no_show',
    'worker_injury',
    'worker_change',
    'crew_shortage',

    -- Other
    'site_access_blocked',
    'utility_issue',
    'design_change',
    'client_request',
    'other'
  )),

  -- Event details
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- When it happened
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_hours NUMERIC(5,2),

  -- Impact assessment
  impact_severity VARCHAR(20) DEFAULT 'medium' CHECK (impact_severity IN (
    'none',       -- No impact on schedule
    'minor',      -- Less than 1 day delay
    'medium',     -- 1-3 days delay
    'major',      -- 3-7 days delay
    'critical'    -- More than 7 days delay
  )),
  estimated_delay_days INTEGER DEFAULT 0,

  -- Source of information
  source VARCHAR(50),  -- weather_api, manual, inspector_report, etc.
  source_reference TEXT,  -- External reference (weather station, report ID)

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES core_profiles(id),
  verified_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_by UUID REFERENCES core_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one of site_id or house_id must be set
  CONSTRAINT event_scope_check CHECK (site_id IS NOT NULL OR house_id IS NOT NULL)
);

-- ============================================================================
-- SECTION 3: MEMORY LAYER - Worker Intelligence
-- ============================================================================

-- int_worker_profiles: AI memory of worker performance
CREATE TABLE int_worker_profiles (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,

  -- Overall statistics
  total_houses_completed INTEGER DEFAULT 0,
  total_phases_completed INTEGER DEFAULT 0,
  total_days_worked INTEGER DEFAULT 0,

  -- Performance metrics
  avg_phase_completion_days NUMERIC(6,2),  -- Average days to complete a phase
  std_dev_phase_days NUMERIC(6,2),          -- Consistency indicator
  on_time_completion_rate NUMERIC(4,3),     -- 0.000 to 1.000

  -- Quality metrics
  avg_ai_approval_rate NUMERIC(4,3),  -- How often AI approves their work
  rework_rate NUMERIC(4,3),           -- How often work needs to be redone
  issue_rate NUMERIC(4,3),            -- Issues per phase

  -- Reliability metrics
  attendance_rate NUMERIC(4,3),       -- Shows up when scheduled
  early_finish_rate NUMERIC(4,3),     -- Finishes ahead of schedule
  delay_contribution_rate NUMERIC(4,3),  -- How often delays are attributed to them

  -- Skill assessment per phase
  phase_performance JSONB DEFAULT '{}',  -- { phase_id: { avg_days, on_time_rate, quality_score } }

  -- Weather resilience
  works_in_cold BOOLEAN,       -- Observed working in cold weather
  works_in_rain BOOLEAN,       -- Observed working in light rain
  weather_sensitivity NUMERIC(4,3),  -- How much weather affects their output

  -- Communication
  response_time_hours NUMERIC(6,2),  -- Avg time to respond to messages
  communication_score NUMERIC(4,3),

  -- AI confidence in this profile
  data_points_count INTEGER DEFAULT 0,
  confidence_score NUMERIC(4,3),  -- Higher with more data
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Notes from supervisors
  supervisor_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(worker_id)
);

-- ============================================================================
-- SECTION 4: MEMORY LAYER - Lot Intelligence
-- ============================================================================

-- int_lot_profiles: AI memory of lot/house characteristics
CREATE TABLE int_lot_profiles (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,

  -- Physical characteristics (learned from history or entered)
  lot_size_sqft NUMERIC(10,2),
  house_type VARCHAR(50),  -- single, semi, town, etc.
  stories INTEGER,
  complexity_score NUMERIC(4,3),  -- 0.000 to 1.000 (higher = more complex)

  -- Location factors
  access_difficulty VARCHAR(20),  -- easy, moderate, difficult
  terrain_type VARCHAR(30),       -- flat, sloped, rocky, etc.
  drainage_issues BOOLEAN DEFAULT false,
  soil_type VARCHAR(30),

  -- Historical performance
  historical_avg_duration_days NUMERIC(6,2),  -- Average from similar lots
  historical_delay_rate NUMERIC(4,3),          -- How often similar lots delayed

  -- Phase-specific history
  phase_difficulty JSONB DEFAULT '{}',  -- { phase_id: { avg_extra_days, common_issues } }

  -- Known issues
  known_issues JSONB DEFAULT '[]',  -- Array of known problems

  -- Neighboring lots influence
  adjacent_lot_ids UUID[],
  neighbor_delay_correlation NUMERIC(4,3),  -- Do neighbor delays predict this lot's delays?

  -- AI predictions
  ai_predicted_total_days INTEGER,
  ai_difficulty_rating VARCHAR(20),  -- easy, moderate, challenging, difficult
  ai_notes TEXT,

  data_points_count INTEGER DEFAULT 0,
  confidence_score NUMERIC(4,3),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(house_id)
);

-- ============================================================================
-- SECTION 5: ANALYSIS LAYER - Delay Attribution
-- ============================================================================

-- int_delay_attributions: Root cause analysis of delays
CREATE TABLE int_delay_attributions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- What was delayed
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES ref_eagle_phases(id),
  schedule_phase_id UUID REFERENCES egl_schedule_phases(id),

  -- Delay details
  delay_days INTEGER NOT NULL,
  delay_start_date DATE NOT NULL,
  delay_end_date DATE,

  -- Root cause (primary)
  primary_cause VARCHAR(50) NOT NULL CHECK (primary_cause IN (
    -- Environmental
    'weather_snow',
    'weather_rain',
    'weather_cold',
    'weather_heat',
    'weather_wind',

    -- Administrative
    'permit_delay',
    'inspection_wait',
    'inspection_fail',
    'design_change',
    'client_change',

    -- Supply
    'material_delay',
    'material_shortage',
    'equipment_failure',

    -- Labor
    'worker_absence',
    'worker_performance',
    'worker_injury',
    'crew_shortage',

    -- Dependencies
    'previous_phase_incomplete',
    'other_trade_delay',

    -- Site
    'site_access',
    'utility_issue',

    -- Other
    'holiday',
    'unknown',
    'other'
  )),

  -- Contributing factors (secondary causes)
  contributing_factors JSONB DEFAULT '[]',  -- Array of { cause, weight }

  -- Attribution confidence
  attribution_confidence NUMERIC(4,3),  -- How sure AI is about this cause

  -- Who/what caused it (if applicable)
  attributed_to_worker_id UUID REFERENCES core_profiles(id),
  attributed_to_external_event_id UUID REFERENCES egl_external_events(id),

  -- Justification assessment
  is_justified BOOLEAN,  -- Snow delay = justified, worker no-show = not justified
  justification_notes TEXT,

  -- Impact assessment
  impact_on_project VARCHAR(20),  -- minimal, moderate, significant, critical
  cascading_delays_count INTEGER DEFAULT 0,  -- How many other phases affected

  -- AI analysis
  ai_generated BOOLEAN DEFAULT true,
  ai_analysis TEXT,
  ai_recommendations JSONB DEFAULT '[]',

  -- Human validation
  validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES core_profiles(id),
  validated_at TIMESTAMPTZ,
  validation_agrees BOOLEAN,  -- Did human agree with AI attribution?
  validation_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 6: ACTION LAYER - AI Reports
-- ============================================================================

-- int_ai_reports: Generated intelligence reports
CREATE TABLE int_ai_reports (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Scope
  site_id UUID REFERENCES egl_sites(id) ON DELETE CASCADE,
  house_id UUID REFERENCES egl_houses(id) ON DELETE CASCADE,

  -- Report type
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
    'weekly_summary',
    'monthly_summary',
    'house_completion',
    'phase_completion',
    'delay_alert',
    'risk_assessment',
    'worker_performance',
    'site_health',
    'custom'
  )),

  -- Time period covered
  period_start DATE,
  period_end DATE,

  -- Report content
  title VARCHAR(200) NOT NULL,
  executive_summary TEXT,

  -- Structured sections
  sections JSONB NOT NULL DEFAULT '[]',
  -- Array of { title, content, type (text/chart/table), data }

  -- Key metrics
  metrics JSONB DEFAULT '{}',
  -- { metric_name: { value, change_pct, trend, benchmark } }

  -- Insights and recommendations
  insights JSONB DEFAULT '[]',
  -- Array of { type (positive/negative/neutral), text, confidence, action_suggested }

  -- Alerts/warnings
  alerts JSONB DEFAULT '[]',
  -- Array of { severity, message, affected_entity, recommended_action }

  -- AI metadata
  ai_model VARCHAR(50),
  ai_confidence NUMERIC(4,3),
  generation_time_ms INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_review',
    'approved',
    'published',
    'archived'
  )),

  -- Review
  reviewed_by UUID REFERENCES core_profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Delivery
  sent_to JSONB DEFAULT '[]',  -- Array of user_ids or emails
  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 7: ACTION LAYER - Contestations
-- ============================================================================

-- int_ai_contestations: User feedback/corrections to AI conclusions
CREATE TABLE int_ai_contestations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- What is being contested
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'delay_attribution',
    'ai_report',
    'risk_assessment',
    'worker_profile',
    'lot_profile',
    'schedule_prediction'
  )),
  entity_id UUID NOT NULL,

  -- Who is contesting
  contested_by UUID NOT NULL REFERENCES core_profiles(id),

  -- Original AI conclusion
  original_conclusion TEXT NOT NULL,
  original_confidence NUMERIC(4,3),

  -- Contestation details
  contestation_reason TEXT NOT NULL,
  suggested_correction TEXT,
  supporting_evidence JSONB DEFAULT '[]',  -- Links to photos, events, etc.

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'under_review',
    'accepted',
    'rejected',
    'partially_accepted'
  )),

  -- Resolution
  resolution_notes TEXT,
  resolved_by UUID REFERENCES core_profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Learning impact
  ai_updated BOOLEAN DEFAULT false,  -- Was AI retrained/updated based on this?
  ai_update_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 8: SCHEDULE TEMPLATES (Reference Data)
-- ============================================================================

-- ref_schedule_templates: Standard schedule templates
CREATE TABLE ref_schedule_templates (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Applicability
  house_type VARCHAR(50),  -- single, semi, town, etc.
  complexity VARCHAR(20),   -- simple, standard, complex

  -- Total expected duration
  total_days INTEGER NOT NULL,

  -- Phase durations
  phases JSONB NOT NULL,
  -- Array of { phase_id, name, duration_days, depends_on, buffer_days }

  -- Seasonal adjustments
  winter_adjustment_pct NUMERIC(5,2),  -- Add X% for winter months
  summer_adjustment_pct NUMERIC(5,2),

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  created_by UUID REFERENCES core_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 9: INDEXES
-- ============================================================================

-- Schedule indexes
CREATE INDEX idx_egl_schedules_house ON egl_schedules(house_id);
CREATE INDEX idx_egl_schedules_status ON egl_schedules(status);
CREATE INDEX idx_egl_schedules_worker ON egl_schedules(assigned_worker_id);
CREATE INDEX idx_egl_schedule_phases_schedule ON egl_schedule_phases(schedule_id);
CREATE INDEX idx_egl_schedule_phases_status ON egl_schedule_phases(status);

-- External events indexes
CREATE INDEX idx_egl_external_events_site ON egl_external_events(site_id);
CREATE INDEX idx_egl_external_events_house ON egl_external_events(house_id);
CREATE INDEX idx_egl_external_events_date ON egl_external_events(event_date DESC);
CREATE INDEX idx_egl_external_events_type ON egl_external_events(event_type);

-- Intelligence indexes
CREATE INDEX idx_int_worker_profiles_worker ON int_worker_profiles(worker_id);
CREATE INDEX idx_int_lot_profiles_house ON int_lot_profiles(house_id);
CREATE INDEX idx_int_delay_attributions_house ON int_delay_attributions(house_id);
CREATE INDEX idx_int_delay_attributions_cause ON int_delay_attributions(primary_cause);
CREATE INDEX idx_int_delay_attributions_worker ON int_delay_attributions(attributed_to_worker_id);

-- Report indexes
CREATE INDEX idx_int_ai_reports_site ON int_ai_reports(site_id);
CREATE INDEX idx_int_ai_reports_house ON int_ai_reports(house_id);
CREATE INDEX idx_int_ai_reports_type ON int_ai_reports(report_type);
CREATE INDEX idx_int_ai_reports_created ON int_ai_reports(created_at DESC);

-- Contestation indexes
CREATE INDEX idx_int_ai_contestations_entity ON int_ai_contestations(entity_type, entity_id);
CREATE INDEX idx_int_ai_contestations_status ON int_ai_contestations(status);

-- ============================================================================
-- SECTION 10: TRIGGERS (updated_at)
-- ============================================================================

CREATE TRIGGER update_egl_schedules_updated_at BEFORE UPDATE ON egl_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_egl_schedule_phases_updated_at BEFORE UPDATE ON egl_schedule_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ref_schedule_templates_updated_at BEFORE UPDATE ON ref_schedule_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_int_delay_attributions_updated_at BEFORE UPDATE ON int_delay_attributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_int_ai_reports_updated_at BEFORE UPDATE ON int_ai_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_int_ai_contestations_updated_at BEFORE UPDATE ON int_ai_contestations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SECTION 11: ENABLE RLS
-- ============================================================================

ALTER TABLE egl_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE egl_schedule_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE egl_external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE int_worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE int_lot_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE int_delay_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE int_ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE int_ai_contestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_schedule_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 12: RLS POLICIES
-- ============================================================================

-- Schedule tables (team-based access - same as Eagle)
CREATE POLICY "egl_schedules_auth_all" ON egl_schedules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_schedule_phases_auth_all" ON egl_schedule_phases
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_external_events_auth_all" ON egl_external_events
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Intelligence tables (read for authenticated, write for admins)
CREATE POLICY "int_worker_profiles_read" ON int_worker_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "int_worker_profiles_write" ON int_worker_profiles
  FOR ALL TO authenticated
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

CREATE POLICY "int_lot_profiles_read" ON int_lot_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "int_lot_profiles_write" ON int_lot_profiles
  FOR ALL TO authenticated
  USING (is_active_admin())
  WITH CHECK (is_active_admin());

-- Delay attributions (read for all, write for admins + system)
CREATE POLICY "int_delay_attributions_read" ON int_delay_attributions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "int_delay_attributions_admin_write" ON int_delay_attributions
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- Anyone can log delays

CREATE POLICY "int_delay_attributions_validate" ON int_delay_attributions
  FOR UPDATE TO authenticated
  USING (true);  -- Anyone can validate

-- AI Reports (read for all, write for admins)
CREATE POLICY "int_ai_reports_read" ON int_ai_reports
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "int_ai_reports_write" ON int_ai_reports
  FOR ALL TO authenticated
  USING (is_active_admin() OR created_at > NOW() - INTERVAL '1 hour')
  WITH CHECK (is_active_admin() OR created_at > NOW() - INTERVAL '1 hour');

-- Contestations (own or admin)
CREATE POLICY "int_ai_contestations_own" ON int_ai_contestations
  FOR ALL TO authenticated
  USING (contested_by = auth.uid() OR is_active_admin())
  WITH CHECK (contested_by = auth.uid() OR is_active_admin());

-- Reference templates (public read)
CREATE POLICY "ref_schedule_templates_public_read" ON ref_schedule_templates
  FOR SELECT TO public
  USING (is_active = true);

-- ============================================================================
-- SECTION 13: SEED DATA - Schedule Templates
-- ============================================================================

INSERT INTO ref_schedule_templates (name, description, house_type, complexity, total_days, phases, is_default) VALUES
(
  'Standard Single Family (3 weeks)',
  'Standard schedule for a single family home with wood frame construction',
  'single',
  'standard',
  21,
  '[
    {"phase_name": "Foundation", "duration_days": 3, "order": 1, "buffer_days": 1, "depends_on": []},
    {"phase_name": "Framing", "duration_days": 5, "order": 2, "buffer_days": 1, "depends_on": ["Foundation"]},
    {"phase_name": "Rough-in", "duration_days": 4, "order": 3, "buffer_days": 1, "depends_on": ["Framing"]},
    {"phase_name": "Insulation", "duration_days": 2, "order": 4, "buffer_days": 0, "depends_on": ["Rough-in"]},
    {"phase_name": "Drywall", "duration_days": 3, "order": 5, "buffer_days": 1, "depends_on": ["Insulation"]},
    {"phase_name": "Finishing", "duration_days": 3, "order": 6, "buffer_days": 1, "depends_on": ["Drywall"]},
    {"phase_name": "Final", "duration_days": 1, "order": 7, "buffer_days": 0, "depends_on": ["Finishing"]}
  ]'::jsonb,
  true
),
(
  'Fast Track Single Family (2 weeks)',
  'Accelerated schedule for simple single family homes',
  'single',
  'simple',
  14,
  '[
    {"phase_name": "Foundation", "duration_days": 2, "order": 1, "buffer_days": 0, "depends_on": []},
    {"phase_name": "Framing", "duration_days": 3, "order": 2, "buffer_days": 0, "depends_on": ["Foundation"]},
    {"phase_name": "Rough-in", "duration_days": 3, "order": 3, "buffer_days": 0, "depends_on": ["Framing"]},
    {"phase_name": "Insulation", "duration_days": 1, "order": 4, "buffer_days": 0, "depends_on": ["Rough-in"]},
    {"phase_name": "Drywall", "duration_days": 2, "order": 5, "buffer_days": 0, "depends_on": ["Insulation"]},
    {"phase_name": "Finishing", "duration_days": 2, "order": 6, "buffer_days": 0, "depends_on": ["Drywall"]},
    {"phase_name": "Final", "duration_days": 1, "order": 7, "buffer_days": 0, "depends_on": ["Finishing"]}
  ]'::jsonb,
  false
),
(
  'Complex Custom Home (5 weeks)',
  'Extended schedule for complex custom homes with higher finish quality',
  'single',
  'complex',
  35,
  '[
    {"phase_name": "Foundation", "duration_days": 5, "order": 1, "buffer_days": 2, "depends_on": []},
    {"phase_name": "Framing", "duration_days": 7, "order": 2, "buffer_days": 2, "depends_on": ["Foundation"]},
    {"phase_name": "Rough-in", "duration_days": 6, "order": 3, "buffer_days": 2, "depends_on": ["Framing"]},
    {"phase_name": "Insulation", "duration_days": 3, "order": 4, "buffer_days": 1, "depends_on": ["Rough-in"]},
    {"phase_name": "Drywall", "duration_days": 5, "order": 5, "buffer_days": 1, "depends_on": ["Insulation"]},
    {"phase_name": "Finishing", "duration_days": 6, "order": 6, "buffer_days": 2, "depends_on": ["Drywall"]},
    {"phase_name": "Final", "duration_days": 3, "order": 7, "buffer_days": 1, "depends_on": ["Finishing"]}
  ]'::jsonb,
  false
);

-- ============================================================================
-- SECTION 14: HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate schedule deviation
CREATE OR REPLACE FUNCTION calculate_schedule_deviation(p_house_id UUID)
RETURNS TABLE (
  deviation_days INTEGER,
  status VARCHAR,
  risk_score NUMERIC
) AS $$
DECLARE
  v_schedule RECORD;
  v_current_phase RECORD;
  v_expected_progress NUMERIC;
  v_actual_progress NUMERIC;
  v_deviation INTEGER;
  v_status VARCHAR;
  v_risk NUMERIC;
BEGIN
  -- Get schedule
  SELECT * INTO v_schedule FROM egl_schedules WHERE house_id = p_house_id;

  IF v_schedule IS NULL THEN
    RETURN QUERY SELECT 0::INTEGER, 'no_schedule'::VARCHAR, 0::NUMERIC;
    RETURN;
  END IF;

  -- Calculate deviation based on expected vs actual progress
  IF v_schedule.actual_start_date IS NULL THEN
    -- Not started yet
    IF v_schedule.expected_start_date < CURRENT_DATE THEN
      v_deviation := CURRENT_DATE - v_schedule.expected_start_date;
      v_status := 'delayed';
    ELSE
      v_deviation := 0;
      v_status := 'scheduled';
    END IF;
  ELSIF v_schedule.actual_end_date IS NOT NULL THEN
    -- Completed
    v_deviation := v_schedule.actual_end_date - v_schedule.expected_end_date;
    v_status := 'completed';
  ELSE
    -- In progress - calculate based on phases
    SELECT COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0)
    INTO v_actual_progress
    FROM egl_schedule_phases WHERE schedule_id = v_schedule.id;

    -- Expected progress based on time elapsed
    v_expected_progress := LEAST(1.0,
      (CURRENT_DATE - v_schedule.expected_start_date)::NUMERIC /
      NULLIF(v_schedule.expected_duration_days, 0));

    -- Calculate deviation
    IF v_actual_progress < v_expected_progress - 0.2 THEN
      v_deviation := CEIL((v_expected_progress - v_actual_progress) * v_schedule.expected_duration_days);
      v_status := 'delayed';
    ELSIF v_actual_progress < v_expected_progress - 0.1 THEN
      v_deviation := CEIL((v_expected_progress - v_actual_progress) * v_schedule.expected_duration_days);
      v_status := 'at_risk';
    ELSE
      v_deviation := FLOOR((v_expected_progress - v_actual_progress) * v_schedule.expected_duration_days);
      v_status := 'on_track';
    END IF;
  END IF;

  -- Calculate risk score (0-1)
  v_risk := LEAST(1.0, GREATEST(0, v_deviation::NUMERIC / NULLIF(v_schedule.expected_duration_days, 0) * 2));

  RETURN QUERY SELECT v_deviation, v_status, v_risk;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-update schedule status based on phase progress
CREATE OR REPLACE FUNCTION update_schedule_from_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- When a phase is marked completed, update the schedule
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update actual_end_date for this phase
    UPDATE egl_schedule_phases
    SET actual_end_date = CURRENT_DATE,
        actual_duration_days = COALESCE(actual_end_date, CURRENT_DATE) - COALESCE(actual_start_date, expected_start_date)
    WHERE id = NEW.id;

    -- Check if all phases complete
    IF NOT EXISTS (
      SELECT 1 FROM egl_schedule_phases sp
      JOIN egl_schedules s ON sp.schedule_id = s.id
      JOIN egl_progress p ON p.house_id = s.house_id AND p.phase_id = sp.phase_id
      WHERE s.id = (SELECT schedule_id FROM egl_schedule_phases WHERE id = NEW.id)
      AND p.status != 'approved'
    ) THEN
      -- All phases complete - update schedule
      UPDATE egl_schedules
      SET status = 'completed',
          actual_end_date = CURRENT_DATE
      WHERE id = (SELECT schedule_id FROM egl_schedule_phases WHERE id = NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 15: VIEWS
-- ============================================================================

-- View: House schedule status with calculated fields
CREATE VIEW v_house_schedule_status AS
SELECT
  s.id as schedule_id,
  s.house_id,
  h.lot_number,
  h.status as house_status,
  s.status as schedule_status,
  s.expected_start_date,
  s.expected_end_date,
  s.expected_duration_days,
  s.actual_start_date,
  s.actual_end_date,
  s.actual_duration_days,
  s.assigned_worker_name,
  s.deviation_days,
  s.ai_risk_score,
  s.ai_predicted_end_date,
  (SELECT COUNT(*) FROM egl_schedule_phases sp WHERE sp.schedule_id = s.id AND sp.status = 'completed') as phases_completed,
  (SELECT COUNT(*) FROM egl_schedule_phases sp WHERE sp.schedule_id = s.id) as phases_total,
  ROUND(
    (SELECT COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1)
    FROM egl_schedule_phases sp WHERE sp.schedule_id = s.id
  ) as completion_percentage
FROM egl_schedules s
JOIN egl_houses h ON s.house_id = h.id;

-- View: Site health dashboard
CREATE VIEW v_site_health AS
SELECT
  site.id as site_id,
  site.name as site_name,
  site.total_lots,
  site.completed_lots,
  COUNT(DISTINCT h.id) as active_houses,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'on_track') as on_track_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'at_risk') as at_risk_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'delayed') as delayed_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') as completed_count,
  AVG(s.deviation_days) FILTER (WHERE s.deviation_days > 0) as avg_delay_days,
  AVG(s.ai_risk_score) as avg_risk_score,
  COUNT(DISTINCT e.id) FILTER (WHERE e.event_date >= CURRENT_DATE - INTERVAL '7 days') as recent_events_count,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'open') as open_issues_count
FROM egl_sites site
LEFT JOIN egl_houses h ON h.site_id = site.id
LEFT JOIN egl_schedules s ON s.house_id = h.id
LEFT JOIN egl_external_events e ON e.site_id = site.id
LEFT JOIN egl_issues i ON i.house_id = h.id
GROUP BY site.id, site.name, site.total_lots, site.completed_lots;

-- View: Delay attribution summary
CREATE VIEW v_delay_summary AS
SELECT
  primary_cause,
  COUNT(*) as occurrence_count,
  SUM(delay_days) as total_delay_days,
  AVG(delay_days) as avg_delay_days,
  COUNT(*) FILTER (WHERE is_justified = true) as justified_count,
  COUNT(*) FILTER (WHERE is_justified = false) as unjustified_count,
  COUNT(DISTINCT attributed_to_worker_id) as workers_involved,
  COUNT(DISTINCT house_id) as houses_affected
FROM int_delay_attributions
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY primary_cause
ORDER BY total_delay_days DESC;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
