// =============================================================================
// SUPABASE TYPES - OnSite Dashboard
// Using REAL table names from Supabase schema
// =============================================================================

// -----------------------------------------------------------------------------
// ENUMS & TYPE ALIASES
// -----------------------------------------------------------------------------

export type SubscriptionStatus = 'none' | 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled'
export type UserLevel = 'rookie' | 'apprentice' | 'journeyman' | 'master' | 'legend'
export type BladesTransactionType = 'earn' | 'redeem' | 'bonus' | 'adjustment' | 'referral'
export type DevicePlatform = 'ios' | 'android' | 'web'
export type EntryType = 'manual' | 'automatic' | 'voice'
export type EntryMethod = 'manual' | 'geofence' | 'qrcode' | 'nfc' | 'voice' | 'auto_timeout'

// -----------------------------------------------------------------------------
// CORE_PROFILES (was: profiles)
// Table: core_profiles
// -----------------------------------------------------------------------------

export interface CoreProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  first_name: string | null
  last_name: string | null
  preferred_name: string | null

  // Professional
  trade: string | null
  trade_other: string | null
  experience_years: number | null
  experience_level: 'apprentice' | 'journeyman' | 'master' | 'foreman' | null
  certifications: string[] | null

  // Employment
  employment_type: 'employee' | 'contractor' | 'self_employed' | 'business_owner' | null
  company_name: string | null
  company_size: 'solo' | '2-10' | '11-50' | '51-200' | '200+' | null

  // Location
  country: string
  province: string | null
  city: string | null
  postal_prefix: string | null
  timezone: string

  // Language
  language_primary: string
  language_secondary: string | null
  language_origin: string | null

  // Preferences
  units_system: 'imperial' | 'metric'
  date_format: string
  time_format: '12h' | '24h'

  // Onboarding
  onboarding_completed_at: string | null
  onboarding_source: string | null
  referral_code: string | null
  referred_by: string | null

  // Engagement
  first_active_at: string | null
  last_active_at: string | null
  total_sessions: number
  profile_completeness: number

  // Timestamps
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// BILLING_SUBSCRIPTIONS (subscription data)
// Table: billing_subscriptions
// -----------------------------------------------------------------------------

export interface BillingSubscription {
  id: string
  user_id: string
  app_name: 'calculator' | 'timekeeper'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  trial_start: string | null
  trial_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  cancellation_reason: string | null
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  has_payment_method: boolean

  // Billing Address
  billing_address_line1: string | null
  billing_address_line2: string | null
  billing_address_city: string | null
  billing_address_state: string | null
  billing_address_postal_code: string | null
  billing_address_country: string | null

  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// CORE_DEVICES (device registration)
// Table: core_devices
// -----------------------------------------------------------------------------

export interface CoreDevice {
  id: string
  user_id: string
  device_id: string
  device_name: string | null
  platform: DevicePlatform
  manufacturer: string | null
  model: string | null
  os_version: string | null
  app_name: string | null
  app_version: string | null
  has_gps: boolean
  has_microphone: boolean
  push_token: string | null
  push_enabled: boolean
  is_primary: boolean
  is_active: boolean
  first_seen_at: string
  last_active_at: string | null
  session_count: number
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// APP_TIMEKEEPER_GEOFENCES (was: locais)
// Table: app_timekeeper_geofences
// -----------------------------------------------------------------------------

export interface TimekeeperGeofence {
  id: string
  user_id: string
  project_id: string | null
  name: string
  latitude: number
  longitude: number
  radius: number
  color: string
  address_street: string | null
  address_city: string | null
  address_province: string | null
  address_postal: string | null
  location_type: 'residential' | 'commercial' | 'industrial' | null
  project_type: 'new_construction' | 'renovation' | 'maintenance' | null
  status: 'active' | 'paused' | 'archived'
  is_favorite: boolean
  total_entries: number
  total_hours: number
  last_entry_at: string | null
  deleted_at: string | null
  synced_at: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// APP_TIMEKEEPER_ENTRIES (was: registros)
// Table: app_timekeeper_entries
// -----------------------------------------------------------------------------

export interface TimekeeperEntry {
  id: string
  user_id: string
  geofence_id: string | null
  location_name: string | null
  entry_at: string
  exit_at: string | null
  type: EntryType
  entry_method: EntryMethod | null
  exit_method: EntryMethod | null
  manually_edited: boolean
  edit_reason: string | null
  original_entry_at: string | null
  original_exit_at: string | null
  duration_minutes: number | null
  pause_minutes: number
  notes: string | null
  tags: string[] | null
  device_id: string | null
  synced_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// BLADES_TRANSACTIONS (same name)
// Table: blades_transactions
// -----------------------------------------------------------------------------

export interface BladesTransaction {
  id: string
  user_id: string
  amount: number
  type: BladesTransactionType
  reason: string | null
  order_id: string | null
  product_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// -----------------------------------------------------------------------------
// ADMIN METRICS (aggregated views)
// -----------------------------------------------------------------------------

export interface AdminMetrics {
  total_users: number
  trial_users: number
  active_paid_users: number
  canceled_users: number
  total_blades: number
  total_sessions: number
  mrr_cad: number
}

export interface FeatureUsage {
  feature: string
  usage_count: number
  unique_users: number
}

// =============================================================================
// LEGACY ALIASES (for backward compatibility during migration)
// These will be removed after full migration
// =============================================================================

/** @deprecated Use CoreProfile instead */
export type Profile = CoreProfile

/** @deprecated Use TimekeeperGeofence instead */
export type Local = TimekeeperGeofence

/** @deprecated Use TimekeeperEntry instead */
export type Registro = TimekeeperEntry

// =============================================================================
// COMPOSITE TYPES (for Dashboard use)
// =============================================================================

/**
 * Profile with subscription data (joined from billing_subscriptions)
 * Used in Dashboard where we need subscription status
 */
export interface ProfileWithSubscription extends CoreProfile {
  // Subscription fields (from billing_subscriptions join)
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: SubscriptionStatus
  trial_ends_at?: string | null
  subscription_started_at?: string | null
  subscription_canceled_at?: string | null
  has_payment_method?: boolean

  // Device fields (from core_devices join)
  device_id?: string | null
  device_registered_at?: string | null
  device_model?: string | null
  device_platform?: DevicePlatform | null

  // Blades fields (aggregated)
  blades_balance?: number
  blades_lifetime_earned?: number
  level?: UserLevel

  // Feature flags
  voice_calculator_enabled?: boolean
  sync_enabled?: boolean

  // Admin
  is_admin?: boolean
  is_suspended?: boolean
}

// =============================================================================
// COLUMN MAPPING REFERENCE
// =============================================================================
/*
OLD (legacy)                 → NEW (real table)
─────────────────────────────────────────────────
profiles                     → core_profiles
  nome                       → full_name (or first_name + last_name)

registros                    → app_timekeeper_entries
  entrada                    → entry_at
  saida                      → exit_at
  local_id                   → geofence_id
  local_nome                 → location_name
  local_latitude             → (JOIN app_timekeeper_geofences.latitude)
  local_longitude            → (JOIN app_timekeeper_geofences.longitude)
  edited_at                  → (use manually_edited boolean)
  edited_by                  → (use entry_method/exit_method)
  original_entrada           → original_entry_at
  original_saida             → original_exit_at

locais                       → app_timekeeper_geofences
  nome                       → name
  endereco                   → address_street (+ address_city, etc.)
  raio                       → radius
  cor                        → color
  ativo                      → status ('active' | 'paused' | 'archived')
*/
