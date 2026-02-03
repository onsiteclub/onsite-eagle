-- ============================================================================
-- ONSITE EAGLE - INITIAL SCHEMA
-- ============================================================================
-- Generated: 2026-02-01
-- Following: DIRECTIVE 2026-02-01 (New Naming Convention)
-- Author: Cerbero (Guardian of Supabase)
-- ============================================================================
--
-- TABLE NAMING CONVENTION:
--   1 owner  = app prefix (tmk_, ccl_, egl_, shp_)
--   +1 owner = core_
--   Reference = ref_
--   Billing = bil_
--   Logs = log_
--   Aggregations = agg_
--   Intelligence = int_
--
-- ============================================================================

-- ============================================================================
-- SECTION 0: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;

-- ============================================================================
-- SECTION 1: HELPER FUNCTIONS (needed before tables)
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if email exists in auth.users
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = email_to_check);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is an active admin
CREATE OR REPLACE FUNCTION is_active_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM core_admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM core_admin_users
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
    AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lookup pending token (for QR code sharing)
CREATE OR REPLACE FUNCTION lookup_pending_token(token_to_lookup TEXT)
RETURNS TABLE (owner_id UUID, owner_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.owner_id, pt.owner_name
  FROM core_pending_tokens pt
  WHERE pt.token = token_to_lookup
  AND pt.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 2: REFERENCE TABLES (ref_)
-- ============================================================================

-- ref_trades: Construction trades/occupations
CREATE TABLE ref_trades (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100),
  name_pt VARCHAR(100),
  name_es VARCHAR(100),
  category VARCHAR(50),
  subcategory VARCHAR(50),
  parent_trade_id UUID REFERENCES ref_trades(id),
  description_en TEXT,
  description_fr TEXT,
  common_tools TEXT[],
  common_materials TEXT[],
  common_calculations TEXT[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ref_provinces: Canadian provinces/territories
CREATE TABLE ref_provinces (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code VARCHAR(2) UNIQUE NOT NULL,
  country VARCHAR(2) DEFAULT 'CA',
  name_en VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100),
  timezone VARCHAR(50),
  has_red_seal BOOLEAN DEFAULT true,
  min_wage NUMERIC(5,2),
  overtime_threshold INTEGER DEFAULT 44,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ref_units: Units of measurement
CREATE TABLE ref_units (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  name_en VARCHAR(50) NOT NULL,
  name_fr VARCHAR(50),
  name_pt VARCHAR(50),
  unit_type VARCHAR(30) NOT NULL, -- length, area, volume, weight, time, etc.
  system VARCHAR(10) NOT NULL CHECK (system IN ('metric', 'imperial', 'both')),
  base_unit_code VARCHAR(20),
  conversion_factor NUMERIC(20,10) DEFAULT 1,
  spoken_variations JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ref_eagle_phases: Construction phases for Eagle app
CREATE TABLE ref_eagle_phases (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  order_index INTEGER NOT NULL,
  description TEXT,
  required_photos INTEGER DEFAULT 2,
  ai_checklist JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ref_eagle_phase_items: Checklist items per phase
CREATE TABLE ref_eagle_phase_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  phase_id UUID NOT NULL REFERENCES ref_eagle_phases(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_critical BOOLEAN DEFAULT false,
  ai_detection_keywords JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 3: CORE TABLES (Shared Identity)
-- ============================================================================

-- core_profiles: User profiles (1:1 with auth.users)
CREATE TABLE core_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  full_name VARCHAR(200),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  preferred_name VARCHAR(100),
  avatar_url TEXT,

  -- Demographics
  date_of_birth DATE,
  phone TEXT,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'undeclared')),

  -- Professional
  trade_id UUID REFERENCES ref_trades(id),
  trade_other VARCHAR(100),
  experience_years INTEGER,
  experience_level VARCHAR(20),
  certifications TEXT[],
  employment_type VARCHAR(30),
  company_name VARCHAR(200),
  company_size VARCHAR(30),
  hourly_rate_range VARCHAR(30),

  -- Location
  country VARCHAR(2) DEFAULT 'CA',
  province VARCHAR(2),
  city VARCHAR(100),
  postal_code_prefix VARCHAR(3),
  timezone VARCHAR(50) DEFAULT 'America/Toronto',

  -- Language
  language_primary VARCHAR(5) DEFAULT 'en',
  language_secondary VARCHAR(5),
  language_origin VARCHAR(5),

  -- Voice preferences
  voice_enabled BOOLEAN DEFAULT false,
  voice_language_preference VARCHAR(5),

  -- Display preferences
  units_system VARCHAR(10) DEFAULT 'imperial',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  time_format VARCHAR(10) DEFAULT '12h',

  -- Device info
  primary_device_id UUID,
  primary_device_model VARCHAR(100),
  primary_device_platform VARCHAR(20),

  -- Onboarding
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_source VARCHAR(50),
  referral_code VARCHAR(20),
  referred_by_user_id UUID REFERENCES core_profiles(id),

  -- Activity metrics
  first_active_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  total_sessions INTEGER DEFAULT 0,
  total_hours_tracked NUMERIC(10,2) DEFAULT 0,
  profile_completeness INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- core_devices: User devices
CREATE TABLE core_devices (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name VARCHAR(100),

  -- Device info
  platform VARCHAR(20), -- ios, android, web
  manufacturer VARCHAR(50),
  model VARCHAR(100),
  os_version VARCHAR(30),

  -- App info
  app_name VARCHAR(50) NOT NULL,
  app_version VARCHAR(20),

  -- Capabilities
  has_gps BOOLEAN DEFAULT true,
  has_microphone BOOLEAN DEFAULT true,
  has_notifications BOOLEAN DEFAULT true,

  -- Push notifications
  push_token TEXT,
  push_enabled BOOLEAN DEFAULT false,
  push_token_updated_at TIMESTAMPTZ,

  -- Status
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  session_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, device_id, app_name)
);

-- core_consents: User consent records (LGPD/GDPR compliance)
CREATE TABLE core_consents (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,

  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN (
    'terms_of_service', 'privacy_policy', 'data_collection',
    'voice_collection', 'voice_training', 'location_tracking',
    'analytics', 'marketing', 'third_party_sharing'
  )),

  -- Document versioning
  document_version VARCHAR(20),
  document_url TEXT,
  document_hash VARCHAR(64),

  -- Consent status
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Context
  ip_address INET,
  user_agent TEXT,
  app_name VARCHAR(50),
  app_version VARCHAR(20),
  collection_method VARCHAR(20) CHECK (collection_method IN (
    'checkbox', 'popup', 'signup_flow', 'settings', 'other'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, consent_type, document_version)
);

-- core_access_grants: QR code based sharing (Timekeeper)
CREATE TABLE core_access_grants (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  label VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  UNIQUE(owner_id, viewer_id)
);

-- core_pending_tokens: Temporary tokens for QR code sharing (5 min TTL)
CREATE TABLE core_pending_tokens (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL UNIQUE,
  owner_name VARCHAR(200),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- core_admin_users: Admin users for Onsite Analytics
CREATE TABLE core_admin_users (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(200),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'super_admin', 'analyst')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES core_admin_users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- core_admin_logs: Admin action logs
CREATE TABLE core_admin_logs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES core_admin_users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- core_voice_logs: Voice transcription logs (shared across apps)
CREATE TABLE core_voice_logs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES core_profiles(id) ON DELETE SET NULL,
  app_name VARCHAR(50),
  feature_context VARCHAR(50),
  session_id UUID,

  -- Audio
  audio_storage_path TEXT,
  audio_duration_ms INTEGER,
  audio_sample_rate INTEGER,
  audio_format VARCHAR(20),

  -- Transcription
  transcription_raw TEXT,
  transcription_normalized TEXT,
  transcription_engine VARCHAR(30),
  transcription_confidence NUMERIC(4,3),

  -- Language
  language_detected VARCHAR(5),
  language_confidence NUMERIC(4,3),
  dialect_region VARCHAR(30),

  -- Intent
  intent_detected VARCHAR(50),
  intent_confidence NUMERIC(4,3),
  intent_fulfilled BOOLEAN,

  -- NLP
  entities JSONB DEFAULT '[]',
  informal_terms JSONB DEFAULT '[]',

  -- Quality
  background_noise_level VARCHAR(20),
  background_noise_type VARCHAR(30),
  speech_clarity VARCHAR(20),

  -- Result
  was_successful BOOLEAN,
  error_type VARCHAR(50),
  error_message TEXT,

  -- Correction
  user_corrected BOOLEAN DEFAULT false,
  user_correction TEXT,
  correction_applied_at TIMESTAMPTZ,

  -- Retry
  retry_count INTEGER DEFAULT 0,
  retry_of_id UUID REFERENCES core_voice_logs(id),

  -- Device context
  device_model VARCHAR(100),
  os VARCHAR(30),
  app_version VARCHAR(20),
  microphone_type VARCHAR(30),

  -- Location
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  client_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- core_ai_conversations: AI chat history (Argus)
CREATE TABLE core_ai_conversations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  title VARCHAR(200),
  messages JSONB DEFAULT '[]',
  starred BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: EAGLE TABLES (Visual Inspection App)
-- ============================================================================

-- egl_sites: Construction sites
CREATE TABLE egl_sites (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  svg_data TEXT,
  original_plan_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- egl_houses: Houses within sites
CREATE TABLE egl_houses (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES egl_sites(id) ON DELETE CASCADE,
  lot_number VARCHAR(50) NOT NULL,
  address TEXT,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'delayed', 'completed'
  )),
  current_phase INTEGER DEFAULT 0,
  progress_percentage NUMERIC(5,2) DEFAULT 0,
  coordinates JSONB, -- {x, y, width, height}
  qr_code_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(site_id, lot_number)
);

-- egl_progress: House phase progress
CREATE TABLE egl_progress (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES ref_eagle_phases(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'ai_review', 'approved', 'rejected'
  )),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES core_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(house_id, phase_id)
);

-- egl_photos: Phase photos with AI validation
CREATE TABLE egl_photos (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES ref_eagle_phases(id),
  uploaded_by UUID REFERENCES core_profiles(id),
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- AI validation
  ai_validation_status VARCHAR(20) DEFAULT 'pending' CHECK (ai_validation_status IN (
    'pending', 'approved', 'rejected', 'needs_review'
  )),
  ai_validation_notes TEXT,
  ai_detected_items JSONB DEFAULT '[]',
  ai_confidence NUMERIC(4,3),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- egl_timeline: Timeline events for houses
CREATE TABLE egl_timeline (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN (
    'photo', 'email', 'calendar', 'note', 'alert',
    'ai_validation', 'status_change', 'issue', 'inspection'
  )),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  source VARCHAR(30), -- gmail, calendar, manual, system, worker_app
  source_link TEXT,
  metadata JSONB,
  created_by UUID REFERENCES core_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- egl_issues: Issues/problems on houses
CREATE TABLE egl_issues (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES egl_houses(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES ref_eagle_phases(id),
  reported_by UUID REFERENCES core_profiles(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN (
    'low', 'medium', 'high', 'critical'
  )),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'resolved'
  )),
  photo_urls JSONB DEFAULT '[]',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES core_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- egl_scans: Plan scans with AI processing
CREATE TABLE egl_scans (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES egl_sites(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  file_type VARCHAR(10),
  ai_processed BOOLEAN DEFAULT false,
  ai_result JSONB,
  generated_svg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: TIMEKEEPER TABLES (Hours Tracking App)
-- ============================================================================

-- tmk_geofences: Geofenced locations
CREATE TABLE tmk_geofences (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color VARCHAR(20),
  icon VARCHAR(50),

  -- Geolocation
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius INTEGER DEFAULT 100, -- meters

  -- Address
  address_street TEXT,
  address_city VARCHAR(100),
  address_province VARCHAR(2),
  address_postal_code VARCHAR(10),

  -- Categorization
  location_type VARCHAR(30),
  project_type VARCHAR(30),
  status VARCHAR(20) DEFAULT 'active',

  -- Usage stats
  is_favorite BOOLEAN DEFAULT false,
  total_entries INTEGER DEFAULT 0,
  total_hours NUMERIC(10,2) DEFAULT 0,
  last_entry_at TIMESTAMPTZ,

  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- tmk_projects: Projects for organizing work
CREATE TABLE tmk_projects (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_name VARCHAR(200),
  color VARCHAR(20),

  -- Categorization
  project_type VARCHAR(30),
  building_type VARCHAR(30),

  -- Estimates
  estimated_hours NUMERIC(10,2),
  estimated_start_date DATE,
  estimated_end_date DATE,

  -- Actuals
  actual_hours NUMERIC(10,2) DEFAULT 0,
  actual_start_date DATE,
  actual_end_date DATE,

  status VARCHAR(20) DEFAULT 'active',
  budget_amount NUMERIC(12,2),
  hourly_rate NUMERIC(8,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- tmk_entries: Time entries (clock in/out)
CREATE TABLE tmk_entries (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,

  -- Location/project
  geofence_id UUID REFERENCES tmk_geofences(id),
  geofence_name TEXT,
  project_id UUID REFERENCES tmk_projects(id),

  -- Times
  entry_at TIMESTAMPTZ NOT NULL,
  exit_at TIMESTAMPTZ,
  pause_minutes INTEGER DEFAULT 0,
  duration_minutes INTEGER,

  -- Entry method
  entry_method TEXT NOT NULL, -- gps_auto, gps_manual, manual, qr_scan
  exit_method TEXT,

  -- Manual edit tracking
  is_manual_entry BOOLEAN DEFAULT false,
  manually_edited BOOLEAN DEFAULT false,
  edit_reason TEXT,
  original_entry_at TIMESTAMPTZ,
  original_exit_at TIMESTAMPTZ,
  integrity_hash VARCHAR(64),

  -- Metadata
  notes TEXT,
  tags TEXT[],
  device_id UUID,

  -- Sync
  client_created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- ============================================================================
-- SECTION 6: CALCULATOR TABLES (Voice Calculator App)
-- ============================================================================

-- ccl_templates: Calculation templates
CREATE TABLE ccl_templates (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  trade_id UUID REFERENCES ref_trades(id),

  formula TEXT NOT NULL,
  input_fields JSONB NOT NULL,
  default_values JSONB,

  is_system BOOLEAN DEFAULT false,
  created_by_user_id UUID REFERENCES core_profiles(id),
  is_public BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ccl_calculations: Calculation history
CREATE TABLE ccl_calculations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES core_profiles(id) ON DELETE SET NULL,

  calculation_type VARCHAR(50) NOT NULL,
  calculation_subtype VARCHAR(50),

  input_values JSONB NOT NULL,
  result_value NUMERIC,
  result_unit VARCHAR(20),
  formula_used TEXT,

  input_method VARCHAR(20) NOT NULL CHECK (input_method IN ('manual', 'voice')),
  voice_log_id UUID REFERENCES core_voice_logs(id),
  template_id UUID REFERENCES ccl_templates(id),
  trade_context VARCHAR(50),

  was_successful BOOLEAN DEFAULT true,
  was_saved BOOLEAN DEFAULT false,
  was_shared BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 7: SHOP TABLES (E-commerce)
-- ============================================================================

-- shp_categories: Product categories
CREATE TABLE shp_categories (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES shp_categories(id),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shp_products: Products for sale
CREATE TABLE shp_products (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,

  category_id UUID REFERENCES shp_categories(id),
  target_trades TEXT[],

  -- Pricing
  base_price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),

  -- Media
  images TEXT[],

  -- Variants
  has_variants BOOLEAN DEFAULT false,
  sizes TEXT[],
  colors TEXT[],

  -- Inventory
  track_inventory BOOLEAN DEFAULT true,
  inventory_quantity INTEGER DEFAULT 0,
  allow_backorder BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,

  -- SEO
  meta_title VARCHAR(200),
  meta_description TEXT,

  -- Stats
  sort_order INTEGER DEFAULT 0,
  total_sold INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shp_variants: Product variants
CREATE TABLE shp_variants (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES shp_products(id) ON DELETE CASCADE,
  sku VARCHAR(100),
  name VARCHAR(200) NOT NULL,
  size VARCHAR(20),
  color VARCHAR(50),
  price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  inventory_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shp_orders: Customer orders
CREATE TABLE shp_orders (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES core_profiles(id),
  order_number VARCHAR(50) NOT NULL UNIQUE,

  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'
  )),

  -- Totals
  subtotal NUMERIC(10,2) NOT NULL,
  shipping NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',

  -- Addresses
  shipping_address JSONB,
  billing_address JSONB,

  -- Payment
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,

  -- Shipping
  shipping_method VARCHAR(50),
  tracking_number VARCHAR(100),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shp_order_items: Order line items
CREATE TABLE shp_order_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES shp_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shp_products(id),
  variant_id UUID REFERENCES shp_variants(id),

  size VARCHAR(20),
  color VARCHAR(50),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,

  -- Snapshot at time of order
  product_name VARCHAR(200) NOT NULL,
  product_sku VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- shp_carts: Shopping carts
CREATE TABLE shp_carts (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES core_profiles(id),
  session_id VARCHAR(100),
  items JSONB DEFAULT '[]',
  subtotal NUMERIC(10,2) DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 8: BILLING TABLES
-- ============================================================================

-- bil_products: Subscription plans
CREATE TABLE bil_products (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  app_name VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  stripe_product_id TEXT,
  stripe_price_id TEXT NOT NULL,

  price_amount INTEGER NOT NULL, -- in cents
  price_currency VARCHAR(3) DEFAULT 'CAD',
  billing_interval VARCHAR(20) DEFAULT 'month',

  features JSONB DEFAULT '[]',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- bil_subscriptions: User subscriptions
CREATE TABLE bil_subscriptions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  app_name VARCHAR(50) NOT NULL,

  plan_id UUID REFERENCES bil_products(id),
  plan_name VARCHAR(100),

  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  status VARCHAR(30) NOT NULL CHECK (status IN (
    'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'
  )),

  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Customer info
  customer_email VARCHAR(255),
  customer_name VARCHAR(200),
  customer_phone VARCHAR(30),

  -- Billing address
  billing_address JSONB,
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_address_city VARCHAR(100),
  billing_address_state VARCHAR(50),
  billing_address_postal_code VARCHAR(20),
  billing_address_country VARCHAR(2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, app_name)
);

-- bil_payments: Payment history
CREATE TABLE bil_payments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  app_name VARCHAR(50) NOT NULL,

  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,

  amount INTEGER, -- in cents
  currency VARCHAR(3) DEFAULT 'CAD',
  status VARCHAR(30),

  -- Billing info snapshot
  billing_name VARCHAR(200),
  billing_email VARCHAR(255),
  billing_phone VARCHAR(30),
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_address_city VARCHAR(100),
  billing_address_state VARCHAR(50),
  billing_address_postal_code VARCHAR(20),
  billing_address_country VARCHAR(2),

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bil_checkout_codes: Magic link checkout codes
CREATE TABLE bil_checkout_codes (
  code TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  app VARCHAR(50),
  redirect_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 9: LOG TABLES (Observability)
-- ============================================================================

-- log_errors: Error logs
CREATE TABLE log_errors (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES core_profiles(id) ON DELETE SET NULL,

  error_type VARCHAR(50) NOT NULL,
  error_code VARCHAR(50),
  error_message TEXT NOT NULL,
  error_stack TEXT,

  app_name VARCHAR(50) NOT NULL,
  screen_name VARCHAR(100),
  action_attempted VARCHAR(100),
  error_context JSONB,

  -- Device info
  device_model VARCHAR(100),
  platform VARCHAR(20),
  os_version VARCHAR(30),
  app_version VARCHAR(20),
  network_type VARCHAR(20),

  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- log_events: Analytics events
CREATE TABLE log_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES core_profiles(id) ON DELETE SET NULL,

  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(50),

  app_name VARCHAR(50) NOT NULL,
  screen_name VARCHAR(100),
  feature_name VARCHAR(100),

  properties JSONB,
  success BOOLEAN,
  error_message TEXT,
  duration_ms INTEGER,

  -- Context
  device_id UUID,
  device_model VARCHAR(100),
  platform VARCHAR(20),
  os_version VARCHAR(30),
  app_version VARCHAR(20),

  session_id UUID,
  country VARCHAR(2),
  province VARCHAR(2),

  client_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- log_locations: GPS location logs
CREATE TABLE log_locations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,
  session_id UUID,
  entry_id UUID,
  geofence_id UUID,

  event_type VARCHAR(30) NOT NULL, -- geofence_enter, geofence_exit, background_update
  trigger_type VARCHAR(30),

  -- Coordinates
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,

  -- Context
  geofence_name VARCHAR(200),
  distance_from_center DOUBLE PRECISION,

  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- ============================================================================
-- SECTION 10: AGGREGATION TABLES
-- ============================================================================

-- agg_platform_daily: Daily platform-wide metrics
CREATE TABLE agg_platform_daily (
  date DATE PRIMARY KEY,

  -- Users
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  churned_users INTEGER DEFAULT 0,
  users_free INTEGER DEFAULT 0,
  users_paid INTEGER DEFAULT 0,

  -- Timekeeper
  total_entries INTEGER DEFAULT 0,
  total_work_hours NUMERIC(12,2) DEFAULT 0,
  entries_manual_pct NUMERIC(5,2) DEFAULT 0,
  entries_auto_pct NUMERIC(5,2) DEFAULT 0,

  -- Calculator
  total_calculations INTEGER DEFAULT 0,
  calculations_voice_pct NUMERIC(5,2) DEFAULT 0,
  voice_success_rate NUMERIC(5,2) DEFAULT 0,

  -- Shop
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  avg_order_value NUMERIC(10,2) DEFAULT 0,

  -- Health
  total_errors INTEGER DEFAULT 0,
  crash_rate NUMERIC(5,4) DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  avg_sessions_per_user NUMERIC(5,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- agg_user_daily: Daily per-user metrics
CREATE TABLE agg_user_daily (
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES core_profiles(id) ON DELETE CASCADE,

  -- App usage
  app_opens INTEGER DEFAULT 0,
  app_foreground_seconds INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,

  -- Work
  work_entries_count INTEGER DEFAULT 0,
  work_entries_manual INTEGER DEFAULT 0,
  work_entries_auto INTEGER DEFAULT 0,
  work_minutes_total INTEGER DEFAULT 0,

  -- Geofences
  geofences_created INTEGER DEFAULT 0,
  geofences_deleted INTEGER DEFAULT 0,
  geofence_triggers INTEGER DEFAULT 0,
  geofence_accuracy_avg NUMERIC(6,2),

  -- Calculator
  calculations_count INTEGER DEFAULT 0,
  calculations_voice INTEGER DEFAULT 0,
  calculations_manual INTEGER DEFAULT 0,
  voice_success_rate NUMERIC(5,2),

  -- Shop
  orders_count INTEGER DEFAULT 0,
  orders_total NUMERIC(10,2) DEFAULT 0,
  cart_abandonment BOOLEAN,

  -- Engagement
  features_used JSONB DEFAULT '[]',
  screens_viewed JSONB DEFAULT '[]',
  notifications_shown INTEGER DEFAULT 0,
  notifications_actioned INTEGER DEFAULT 0,

  -- Sync
  sync_attempts INTEGER DEFAULT 0,
  sync_failures INTEGER DEFAULT 0,

  -- Health
  errors_count INTEGER DEFAULT 0,
  app_version VARCHAR(20),
  os VARCHAR(30),
  device_model VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (date, user_id)
);

-- agg_trade_weekly: Weekly metrics by trade/province
CREATE TABLE agg_trade_weekly (
  week_start DATE NOT NULL,
  trade_id UUID NOT NULL REFERENCES ref_trades(id),
  province VARCHAR(2) NOT NULL,

  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,

  total_work_hours NUMERIC(12,2) DEFAULT 0,
  avg_hours_per_user NUMERIC(6,2) DEFAULT 0,
  median_hours_per_user NUMERIC(6,2) DEFAULT 0,

  peak_start_hour INTEGER,
  peak_end_hour INTEGER,
  avg_session_duration INTEGER DEFAULT 0,

  voice_usage_pct NUMERIC(5,2) DEFAULT 0,
  top_intents JSONB DEFAULT '[]',
  common_terms JSONB DEFAULT '[]',
  sample_size INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (week_start, trade_id, province)
);

-- ============================================================================
-- SECTION 11: INTELLIGENCE TABLES (ML Patterns)
-- ============================================================================

-- int_behavior_patterns: User behavior patterns
CREATE TABLE int_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  segment_type VARCHAR(30) NOT NULL, -- trade, province, experience_level, etc.
  segment_value VARCHAR(100) NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- week, month, quarter
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  avg_hours_per_week NUMERIC(6,2),
  median_hours_per_week NUMERIC(6,2),
  std_dev_hours NUMERIC(6,2),

  peak_work_day INTEGER, -- 1=Monday, 7=Sunday
  peak_start_hour INTEGER,
  peak_end_hour INTEGER,

  avg_sessions_per_week NUMERIC(5,2),
  feature_adoption JSONB DEFAULT '{}',
  sample_size INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- int_voice_patterns: Voice/NLP patterns
CREATE TABLE int_voice_patterns (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  pattern_type VARCHAR(30) NOT NULL, -- informal_term, unit_variation, intent
  raw_form TEXT NOT NULL,
  normalized_form TEXT NOT NULL,

  language VARCHAR(5),
  dialect_region VARCHAR(30),
  trade_context VARCHAR(50),

  occurrence_count INTEGER DEFAULT 0,
  unique_users_count INTEGER DEFAULT 0,
  confidence_avg NUMERIC(4,3),

  variations JSONB DEFAULT '[]',
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES core_admin_users(id),
  validated_at TIMESTAMPTZ,

  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 12: INDEXES
-- ============================================================================

-- Core indexes
CREATE INDEX idx_profiles_trade ON core_profiles(trade_id);
CREATE INDEX idx_profiles_province ON core_profiles(province);
CREATE INDEX idx_profiles_last_active ON core_profiles(last_active_at DESC);
CREATE INDEX idx_devices_user ON core_devices(user_id);
CREATE INDEX idx_consents_user ON core_consents(user_id);
CREATE INDEX idx_access_grants_owner ON core_access_grants(owner_id);
CREATE INDEX idx_access_grants_viewer ON core_access_grants(viewer_id);
CREATE INDEX idx_pending_tokens_token ON core_pending_tokens(token);
CREATE INDEX idx_pending_tokens_expires ON core_pending_tokens(expires_at);
CREATE INDEX idx_voice_logs_user ON core_voice_logs(user_id);
CREATE INDEX idx_voice_logs_app ON core_voice_logs(app_name);

-- Eagle indexes
CREATE INDEX idx_egl_houses_site ON egl_houses(site_id);
CREATE INDEX idx_egl_houses_status ON egl_houses(status);
CREATE INDEX idx_egl_progress_house ON egl_progress(house_id);
CREATE INDEX idx_egl_photos_house ON egl_photos(house_id);
CREATE INDEX idx_egl_timeline_house ON egl_timeline(house_id);
CREATE INDEX idx_egl_timeline_created ON egl_timeline(created_at DESC);
CREATE INDEX idx_egl_issues_house ON egl_issues(house_id);
CREATE INDEX idx_egl_issues_status ON egl_issues(status);

-- Timekeeper indexes
CREATE INDEX idx_tmk_geofences_user ON tmk_geofences(user_id);
CREATE INDEX idx_tmk_geofences_active ON tmk_geofences(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tmk_projects_user ON tmk_projects(user_id);
CREATE INDEX idx_tmk_projects_active ON tmk_projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tmk_entries_user ON tmk_entries(user_id);
CREATE INDEX idx_tmk_entries_active ON tmk_entries(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tmk_entries_entry_at ON tmk_entries(entry_at DESC);
CREATE INDEX idx_tmk_entries_geofence ON tmk_entries(geofence_id);

-- Calculator indexes
CREATE INDEX idx_ccl_calculations_user ON ccl_calculations(user_id);
CREATE INDEX idx_ccl_calculations_type ON ccl_calculations(calculation_type);
CREATE INDEX idx_ccl_templates_category ON ccl_templates(category);
CREATE INDEX idx_ccl_templates_trade ON ccl_templates(trade_id);

-- Shop indexes
CREATE INDEX idx_shp_products_category ON shp_products(category_id);
CREATE INDEX idx_shp_products_active ON shp_products(is_active, is_published);
CREATE INDEX idx_shp_orders_user ON shp_orders(user_id);
CREATE INDEX idx_shp_orders_status ON shp_orders(status);
CREATE INDEX idx_shp_order_items_order ON shp_order_items(order_id);

-- Billing indexes
CREATE INDEX idx_bil_subscriptions_user ON bil_subscriptions(user_id);
CREATE INDEX idx_bil_subscriptions_app ON bil_subscriptions(app_name);
CREATE INDEX idx_bil_subscriptions_status ON bil_subscriptions(status);
CREATE INDEX idx_bil_payments_user ON bil_payments(user_id);

-- Log indexes
CREATE INDEX idx_log_errors_app ON log_errors(app_name);
CREATE INDEX idx_log_errors_occurred ON log_errors(occurred_at DESC);
CREATE INDEX idx_log_events_user ON log_events(user_id);
CREATE INDEX idx_log_events_name ON log_events(event_name);
CREATE INDEX idx_log_locations_user ON log_locations(user_id);
CREATE INDEX idx_log_locations_occurred ON log_locations(occurred_at DESC);

-- Aggregation indexes
CREATE INDEX idx_agg_user_daily_user ON agg_user_daily(user_id);

-- ============================================================================
-- SECTION 13: TRIGGERS (updated_at)
-- ============================================================================

-- Reference tables
CREATE TRIGGER update_ref_trades_updated_at BEFORE UPDATE ON ref_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_ref_provinces_updated_at BEFORE UPDATE ON ref_provinces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Core tables
CREATE TRIGGER update_core_profiles_updated_at BEFORE UPDATE ON core_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_core_devices_updated_at BEFORE UPDATE ON core_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_core_admin_users_updated_at BEFORE UPDATE ON core_admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_core_ai_conversations_updated_at BEFORE UPDATE ON core_ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Eagle tables
CREATE TRIGGER update_egl_sites_updated_at BEFORE UPDATE ON egl_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_egl_houses_updated_at BEFORE UPDATE ON egl_houses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_egl_progress_updated_at BEFORE UPDATE ON egl_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Timekeeper tables
CREATE TRIGGER update_tmk_geofences_updated_at BEFORE UPDATE ON tmk_geofences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tmk_projects_updated_at BEFORE UPDATE ON tmk_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tmk_entries_updated_at BEFORE UPDATE ON tmk_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculator tables
CREATE TRIGGER update_ccl_templates_updated_at BEFORE UPDATE ON ccl_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Shop tables
CREATE TRIGGER update_shp_categories_updated_at BEFORE UPDATE ON shp_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shp_products_updated_at BEFORE UPDATE ON shp_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shp_variants_updated_at BEFORE UPDATE ON shp_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shp_orders_updated_at BEFORE UPDATE ON shp_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shp_carts_updated_at BEFORE UPDATE ON shp_carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Billing tables
CREATE TRIGGER update_bil_products_updated_at BEFORE UPDATE ON bil_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bil_subscriptions_updated_at BEFORE UPDATE ON bil_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Aggregation tables
CREATE TRIGGER update_agg_platform_daily_updated_at BEFORE UPDATE ON agg_platform_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_agg_user_daily_updated_at BEFORE UPDATE ON agg_user_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_agg_trade_weekly_updated_at BEFORE UPDATE ON agg_trade_weekly
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Intelligence tables
CREATE TRIGGER update_int_behavior_patterns_updated_at BEFORE UPDATE ON int_behavior_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_int_voice_patterns_updated_at BEFORE UPDATE ON int_voice_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SECTION 14: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE ref_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_eagle_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_eagle_phase_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE core_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_pending_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_voice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_ai_conversations ENABLE ROW LEVEL SECURITY;

ALTER TABLE egl_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE egl_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE egl_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE egl_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE egl_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE egl_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE egl_scans ENABLE ROW LEVEL SECURITY;

ALTER TABLE tmk_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tmk_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tmk_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE ccl_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccl_calculations ENABLE ROW LEVEL SECURITY;

ALTER TABLE shp_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_carts ENABLE ROW LEVEL SECURITY;

ALTER TABLE bil_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bil_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bil_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bil_checkout_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE log_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_locations ENABLE ROW LEVEL SECURITY;

ALTER TABLE agg_platform_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE agg_user_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE agg_trade_weekly ENABLE ROW LEVEL SECURITY;

ALTER TABLE int_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE int_voice_patterns ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 15: RLS POLICIES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- REFERENCE TABLES (Public Read)
-- -----------------------------------------------------------------------------

CREATE POLICY "ref_trades_public_read" ON ref_trades
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "ref_provinces_public_read" ON ref_provinces
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "ref_units_public_read" ON ref_units
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "ref_eagle_phases_public_read" ON ref_eagle_phases
  FOR SELECT TO public USING (true);

CREATE POLICY "ref_eagle_phase_items_public_read" ON ref_eagle_phase_items
  FOR SELECT TO public USING (true);

-- -----------------------------------------------------------------------------
-- CORE_PROFILES (Own data + shared via access_grants)
-- -----------------------------------------------------------------------------

CREATE POLICY "profiles_select_own" ON core_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_shared" ON core_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core_access_grants
      WHERE owner_id = core_profiles.id
      AND viewer_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "profiles_insert_own" ON core_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON core_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- CORE_DEVICES (Own data only)
-- -----------------------------------------------------------------------------

CREATE POLICY "devices_all_own" ON core_devices
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- CORE_CONSENTS (Own data only)
-- -----------------------------------------------------------------------------

CREATE POLICY "consents_select_own" ON core_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "consents_insert_own" ON core_consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- CORE_ACCESS_GRANTS (Owner + Viewer)
-- -----------------------------------------------------------------------------

CREATE POLICY "access_grants_owner_all" ON core_access_grants
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "access_grants_viewer_select" ON core_access_grants
  FOR SELECT TO authenticated
  USING (viewer_id = auth.uid());

CREATE POLICY "access_grants_viewer_insert" ON core_access_grants
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- -----------------------------------------------------------------------------
-- CORE_PENDING_TOKENS (Owner only, lookup via function)
-- -----------------------------------------------------------------------------

CREATE POLICY "pending_tokens_owner_all" ON core_pending_tokens
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- CORE_ADMIN_USERS (Complex admin-only)
-- -----------------------------------------------------------------------------

CREATE POLICY "admin_users_select_own" ON core_admin_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admin_users_select_admins" ON core_admin_users
  FOR SELECT TO authenticated
  USING (is_active_admin());

CREATE POLICY "admin_users_insert_self" ON core_admin_users
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_users_update_super" ON core_admin_users
  FOR UPDATE TO authenticated
  USING (is_super_admin());

CREATE POLICY "admin_users_delete_super" ON core_admin_users
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- -----------------------------------------------------------------------------
-- CORE_ADMIN_LOGS (Active admins only)
-- -----------------------------------------------------------------------------

CREATE POLICY "admin_logs_admin_select" ON core_admin_logs
  FOR SELECT TO authenticated
  USING (is_active_admin());

CREATE POLICY "admin_logs_admin_insert" ON core_admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_active_admin());

-- -----------------------------------------------------------------------------
-- CORE_VOICE_LOGS (Own or null user_id)
-- -----------------------------------------------------------------------------

CREATE POLICY "voice_logs_select" ON core_voice_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "voice_logs_insert" ON core_voice_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- -----------------------------------------------------------------------------
-- CORE_AI_CONVERSATIONS (Own data only)
-- -----------------------------------------------------------------------------

CREATE POLICY "ai_conversations_all_own" ON core_ai_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- EAGLE TABLES (Authenticated users - team based)
-- Note: In production, add site/team membership checks
-- -----------------------------------------------------------------------------

CREATE POLICY "egl_sites_auth_all" ON egl_sites
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_houses_auth_all" ON egl_houses
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_progress_auth_all" ON egl_progress
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_photos_auth_all" ON egl_photos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_timeline_auth_all" ON egl_timeline
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_issues_auth_all" ON egl_issues
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "egl_scans_auth_all" ON egl_scans
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- TIMEKEEPER TABLES (Own data + shared via access_grants)
-- -----------------------------------------------------------------------------

CREATE POLICY "tmk_geofences_own" ON tmk_geofences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tmk_geofences_shared_select" ON tmk_geofences
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core_access_grants
      WHERE owner_id = tmk_geofences.user_id
      AND viewer_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "tmk_projects_own" ON tmk_projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tmk_projects_shared_select" ON tmk_projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core_access_grants
      WHERE owner_id = tmk_projects.user_id
      AND viewer_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "tmk_entries_own" ON tmk_entries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tmk_entries_shared_select" ON tmk_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core_access_grants
      WHERE owner_id = tmk_entries.user_id
      AND viewer_id = auth.uid()
      AND status = 'active'
    )
  );

-- -----------------------------------------------------------------------------
-- CALCULATOR TABLES
-- -----------------------------------------------------------------------------

CREATE POLICY "ccl_templates_public_read" ON ccl_templates
  FOR SELECT TO public
  USING (is_system = true OR is_public = true);

CREATE POLICY "ccl_templates_own" ON ccl_templates
  FOR ALL TO authenticated
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "ccl_calculations_select" ON ccl_calculations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "ccl_calculations_insert" ON ccl_calculations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- -----------------------------------------------------------------------------
-- SHOP TABLES
-- -----------------------------------------------------------------------------

CREATE POLICY "shp_categories_public_read" ON shp_categories
  FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "shp_products_public_read" ON shp_products
  FOR SELECT TO public
  USING (is_active = true AND is_published = true);

CREATE POLICY "shp_variants_public_read" ON shp_variants
  FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "shp_orders_own" ON shp_orders
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "shp_orders_anon_insert" ON shp_orders
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "shp_order_items_via_order" ON shp_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shp_orders
      WHERE shp_orders.id = shp_order_items.order_id
      AND shp_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "shp_carts_own" ON shp_carts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- BILLING TABLES
-- -----------------------------------------------------------------------------

CREATE POLICY "bil_products_public_read" ON bil_products
  FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "bil_subscriptions_own_select" ON bil_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bil_payments_own_select" ON bil_payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bil_checkout_codes_own" ON bil_checkout_codes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bil_checkout_codes_update_own" ON bil_checkout_codes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- LOG TABLES (Own or null + service_role)
-- -----------------------------------------------------------------------------

CREATE POLICY "log_errors_select" ON log_errors
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "log_errors_insert" ON log_errors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "log_events_select" ON log_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "log_events_insert" ON log_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "log_locations_own" ON log_locations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- AGGREGATION TABLES (Admin only for platform, own for user)
-- -----------------------------------------------------------------------------

CREATE POLICY "agg_platform_daily_admin" ON agg_platform_daily
  FOR ALL TO authenticated
  USING (is_active_admin());

CREATE POLICY "agg_user_daily_own" ON agg_user_daily
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "agg_user_daily_insert" ON agg_user_daily
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "agg_user_daily_update" ON agg_user_daily
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "agg_trade_weekly_admin" ON agg_trade_weekly
  FOR ALL TO authenticated
  USING (is_active_admin());

-- -----------------------------------------------------------------------------
-- INTELLIGENCE TABLES (Admin only)
-- -----------------------------------------------------------------------------

CREATE POLICY "int_behavior_patterns_admin" ON int_behavior_patterns
  FOR ALL TO authenticated
  USING (is_active_admin());

CREATE POLICY "int_voice_patterns_admin" ON int_voice_patterns
  FOR ALL TO authenticated
  USING (is_active_admin());

-- ============================================================================
-- SECTION 16: SEED DATA (Reference Tables)
-- ============================================================================

-- Canadian provinces
INSERT INTO ref_provinces (code, name_en, name_fr, timezone, min_wage, overtime_threshold) VALUES
  ('AB', 'Alberta', 'Alberta', 'America/Edmonton', 15.00, 44),
  ('BC', 'British Columbia', 'Colombie-Britannique', 'America/Vancouver', 16.75, 40),
  ('MB', 'Manitoba', 'Manitoba', 'America/Winnipeg', 15.30, 40),
  ('NB', 'New Brunswick', 'Nouveau-Brunswick', 'America/Moncton', 14.75, 44),
  ('NL', 'Newfoundland and Labrador', 'Terre-Neuve-et-Labrador', 'America/St_Johns', 15.00, 40),
  ('NS', 'Nova Scotia', 'Nouvelle-Ecosse', 'America/Halifax', 15.00, 48),
  ('NT', 'Northwest Territories', 'Territoires du Nord-Ouest', 'America/Yellowknife', 16.05, 44),
  ('NU', 'Nunavut', 'Nunavut', 'America/Iqaluit', 16.00, 40),
  ('ON', 'Ontario', 'Ontario', 'America/Toronto', 16.55, 44),
  ('PE', 'Prince Edward Island', 'Ile-du-Prince-Edouard', 'America/Halifax', 15.00, 48),
  ('QC', 'Quebec', 'Quebec', 'America/Montreal', 15.25, 40),
  ('SK', 'Saskatchewan', 'Saskatchewan', 'America/Regina', 14.00, 40),
  ('YT', 'Yukon', 'Yukon', 'America/Whitehorse', 16.77, 40);

-- Common construction trades
INSERT INTO ref_trades (code, name_en, name_fr, name_pt, category) VALUES
  ('CARP', 'Carpenter', 'Charpentier', 'Carpinteiro', 'construction'),
  ('ELEC', 'Electrician', 'Electricien', 'Eletricista', 'electrical'),
  ('PLMB', 'Plumber', 'Plombier', 'Encanador', 'plumbing'),
  ('HVAC', 'HVAC Technician', 'Technicien CVC', 'Tecnico HVAC', 'mechanical'),
  ('DRYW', 'Drywall Installer', 'Poseur de cloisons seches', 'Gesseiro', 'finishing'),
  ('ROOF', 'Roofer', 'Couvreur', 'Telhador', 'roofing'),
  ('CONC', 'Concrete Finisher', 'Finisseur de beton', 'Pedreiro', 'concrete'),
  ('FRME', 'Framer', 'Charpentier-monteur', 'Estruturador', 'framing'),
  ('PAIN', 'Painter', 'Peintre', 'Pintor', 'finishing'),
  ('TILE', 'Tile Setter', 'Carreleur', 'Azulejista', 'finishing'),
  ('INSL', 'Insulator', 'Calorifugeur', 'Isolador', 'insulation'),
  ('GLAZ', 'Glazier', 'Vitrier', 'Vidraceiro', 'glazing'),
  ('IRON', 'Ironworker', 'Ferrailleur', 'Ferreiro', 'structural'),
  ('MASO', 'Mason', 'Macon', 'Pedreiro', 'masonry'),
  ('GENL', 'General Labourer', 'Manoeuvre', 'Ajudante Geral', 'general'),
  ('SUPR', 'Supervisor', 'Superviseur', 'Supervisor', 'management'),
  ('OTHR', 'Other', 'Autre', 'Outro', 'other');

-- Common units
INSERT INTO ref_units (code, symbol, name_en, unit_type, system) VALUES
  ('ft', 'ft', 'Feet', 'length', 'imperial'),
  ('in', 'in', 'Inches', 'length', 'imperial'),
  ('m', 'm', 'Meters', 'length', 'metric'),
  ('cm', 'cm', 'Centimeters', 'length', 'metric'),
  ('sqft', 'sq ft', 'Square Feet', 'area', 'imperial'),
  ('sqm', 'm²', 'Square Meters', 'area', 'metric'),
  ('cuft', 'cu ft', 'Cubic Feet', 'volume', 'imperial'),
  ('cum', 'm³', 'Cubic Meters', 'volume', 'metric'),
  ('lb', 'lb', 'Pounds', 'weight', 'imperial'),
  ('kg', 'kg', 'Kilograms', 'weight', 'metric');

-- Eagle phases (wood frame construction)
INSERT INTO ref_eagle_phases (name, order_index, description, required_photos, ai_checklist) VALUES
  ('Foundation', 1, 'Foundation and footings', 3, '["Footings poured", "Foundation walls", "Waterproofing", "Drainage"]'),
  ('Framing', 2, 'Structural framing', 4, '["Floor joists", "Wall framing", "Roof trusses", "Sheathing", "Windows rough openings"]'),
  ('Rough-in', 3, 'Mechanical rough-in', 3, '["Electrical rough-in", "Plumbing rough-in", "HVAC ductwork"]'),
  ('Insulation', 4, 'Insulation and vapor barrier', 2, '["Wall insulation", "Ceiling insulation", "Vapor barrier"]'),
  ('Drywall', 5, 'Drywall installation', 2, '["Drywall hung", "Taping complete", "Mudding complete"]'),
  ('Finishing', 6, 'Interior finishing', 3, '["Trim installed", "Paint complete", "Flooring installed", "Cabinets installed"]'),
  ('Final', 7, 'Final inspection prep', 2, '["Fixtures installed", "Touch-ups complete", "Cleanup complete"]');

-- ============================================================================
-- SECTION 17: COMPATIBILITY VIEWS (Optional - Legacy Names)
-- ============================================================================
-- NOTE: Using SELECT * ensures views auto-include new columns added to base tables

-- Eagle legacy names
CREATE VIEW sites AS SELECT * FROM egl_sites;
CREATE VIEW houses AS SELECT * FROM egl_houses;
CREATE VIEW phases AS SELECT * FROM ref_eagle_phases;
CREATE VIEW phase_items AS SELECT * FROM ref_eagle_phase_items;
CREATE VIEW house_progress AS SELECT * FROM egl_progress;
CREATE VIEW phase_photos AS SELECT * FROM egl_photos;
CREATE VIEW timeline_events AS SELECT * FROM egl_timeline;
CREATE VIEW issues AS SELECT * FROM egl_issues;
CREATE VIEW plan_scans AS SELECT * FROM egl_scans;

-- Core legacy names
CREATE VIEW profiles AS SELECT * FROM core_profiles;
CREATE VIEW consents AS SELECT * FROM core_consents;
CREATE VIEW access_grants AS SELECT * FROM core_access_grants;
CREATE VIEW pending_tokens AS SELECT * FROM core_pending_tokens;
CREATE VIEW admin_users AS SELECT * FROM core_admin_users;
CREATE VIEW voice_logs AS SELECT * FROM core_voice_logs;
CREATE VIEW argus_conversations AS SELECT * FROM core_ai_conversations;

-- Timekeeper legacy names
CREATE VIEW app_timekeeper_entries AS SELECT * FROM tmk_entries;
CREATE VIEW app_timekeeper_geofences AS SELECT * FROM tmk_geofences;
CREATE VIEW app_timekeeper_projects AS SELECT * FROM tmk_projects;

-- Calculator legacy names
CREATE VIEW app_calculator_calculations AS SELECT * FROM ccl_calculations;
CREATE VIEW app_calculator_templates AS SELECT * FROM ccl_templates;

-- Shop legacy names
CREATE VIEW app_shop_products AS SELECT * FROM shp_products;
CREATE VIEW app_shop_categories AS SELECT * FROM shp_categories;
CREATE VIEW app_shop_orders AS SELECT * FROM shp_orders;
CREATE VIEW app_shop_order_items AS SELECT * FROM shp_order_items;
CREATE VIEW app_shop_carts AS SELECT * FROM shp_carts;
CREATE VIEW app_shop_product_variants AS SELECT * FROM shp_variants;

-- Billing legacy names
CREATE VIEW billing_products AS SELECT * FROM bil_products;
CREATE VIEW billing_subscriptions AS SELECT * FROM bil_subscriptions;
CREATE VIEW payment_history AS SELECT * FROM bil_payments;
CREATE VIEW checkout_codes AS SELECT * FROM bil_checkout_codes;

-- ============================================================================
-- END OF INITIAL SCHEMA
-- ============================================================================
