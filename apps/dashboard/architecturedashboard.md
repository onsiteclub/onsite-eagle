# ONSITE DASHBOARD - AI CONTEXT ARCHITECTURE DOCUMENT

> **PURPOSE:** Machine-readable architecture reference for AI assistants. Optimized for fast context loading and accurate code generation.
>
> **LAST UPDATED:** January 2025 (Post-refactoring to real Supabase table names)

---

## METADATA

```yaml
project: onsite-dashboard
version: 4.0
framework: next@14.2.21
language: typescript@5.3.3
ui: react@18.3.1 + tailwindcss@3.4.1
database: supabase-postgresql
auth: supabase-auth
payments: stripe
deploy: vercel
domain: app.onsiteclub.ca
currency: CAD
locale: en-CA
trial_days: 180
subscription_price: 9.99/month
```

---

## TABLE NAME MAPPING (CRITICAL)

> **IMPORTANT:** The codebase was refactored from legacy table names to real Supabase table names.

| Legacy Name (Views) | Real Table Name | TypeScript Type |
|---------------------|-----------------|-----------------|
| `profiles` | `core_profiles` | `CoreProfile` |
| `registros` | `app_timekeeper_entries` | `TimekeeperEntry` |
| `locais` | `app_timekeeper_geofences` | `TimekeeperGeofence` |
| `blades_transactions` | `blades_transactions` | `BladesTransaction` |
| *(new)* | `billing_subscriptions` | `BillingSubscription` |
| *(new)* | `core_devices` | `CoreDevice` |
| *(new)* | `admin_users` | *(admin check)* |

### Column Mapping Reference

```
OLD (legacy)                 → NEW (real table)
─────────────────────────────────────────────────
profiles                     → core_profiles
  nome                       → full_name (or first_name + last_name)
  company                    → company_name
  last_seen_at               → last_active_at

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
```

---

## FILE_MAP

### ROOT_CONFIG
```
middleware.ts           → Auth guard for /account/*, /admin/* routes
                          Uses: core_profiles, admin_users
next.config.js          → Image domains: *.supabase.co
tailwind.config.js      → Brand colors: amber-500 (#f59e0b), amber-600 (#d97706)
tsconfig.json           → Path alias: @/* → ./*
package.json            → Dependencies manifest
```

### APP_ROUTER
```
app/
├── layout.tsx                              → RootLayout: html, body, Inter font
├── page.tsx                                → AUTH_PAGE: email-first login/signup flow
├── globals.css                             → Tailwind directives + custom scrollbar
├── reset-password/page.tsx                 → Password reset form (post-callback)
├── auth/callback/route.ts                  → OAuth/magic-link/reset callback handler
├── terms/page.tsx                          → Static: Terms of Use
├── privacy/page.tsx                        → Static: Privacy Policy
├── security/page.tsx                       → Static: Data Security
├── cancellation/page.tsx                   → Static: Cancellation Policy
│
├── (dashboard)/                            → ROUTE_GROUP: protected, shared layout
│   ├── layout.tsx                          → DashboardLayout: Sidebar + Header + main
│   │                                         Fetches: core_profiles, billing_subscriptions,
│   │                                                  core_devices, blades_transactions
│   └── account/
│       ├── page.tsx                        → HUB: app cards grid, trial banner
│       ├── profile/
│       │   ├── page.tsx                    → Server: fetch core_profiles, render form
│       │   └── EditProfileForm.tsx         → Client: avatar upload, form fields
│       ├── settings/
│       │   ├── page.tsx                    → Server: fetch core_profiles + billing_subscriptions
│       │   │                                 + core_devices
│       │   ├── SubscriptionManager.tsx     → Client: Stripe checkout/portal/cancel
│       │   └── DeviceManager.tsx           → Client: device info, unlink action
│       ├── timekeeper/
│       │   ├── page.tsx                    → Server: fetch app_timekeeper_entries +
│       │   │                                 app_timekeeper_geofences
│       │   ├── TimekeeperDashboard.tsx     → Client: filters, chart, table, export
│       │   │                                 Uses: TimekeeperEntry, TimekeeperGeofence types
│       │   └── components/
│       │       ├── DateRangePicker.tsx     → Client: preset buttons + custom range
│       │       ├── EditableCell.tsx        → Client: inline time editing
│       │       ├── HoursChart.tsx          → Client: Recharts bar chart
│       │       ├── ReportHeader.tsx        → Hidden component for PDF header
│       │       └── index.ts                → Barrel export
│       ├── calculator/page.tsx             → Calculator access + voice unlock CTA
│       ├── shop/page.tsx                   → Shopify link + blades balance
│       ├── blades/page.tsx                 → Rewards dashboard + transactions
│       │                                     Fetches: blades_transactions (calculates balance)
│       ├── courses/page.tsx                → Coming soon placeholder
│       └── checklist/page.tsx              → Coming soon placeholder
│
└── api/
    ├── auth/callback/route.ts              → Duplicate of app/auth/callback (legacy)
    ├── stripe/
    │   ├── checkout/route.ts               → POST: create checkout session
    │   ├── portal/route.ts                 → POST: create billing portal session
    │   └── cancel/route.ts                 → POST: cancel subscription at period end
    ├── webhooks/stripe/route.ts            → POST: Stripe event handler (service role)
    ├── profile/
    │   ├── update/route.ts                 → POST: update core_profiles fields
    │   └── avatar/route.ts                 → POST: upload avatar to storage
    ├── device/unlink/route.ts              → POST: clear device fields in core_devices
    ├── assistant/
    │   └── chat/route.ts                   → POST: AI assistant chat (OpenAI)
    └── timekeeper/
        ├── update/route.ts                 → PATCH: edit app_timekeeper_entries
        │                                     Maps: entrada→entry_at, saida→exit_at
        └── export/
            ├── excel/route.ts              → POST: generate XLSX report
            └── pdf/route.ts                → POST: generate PDF report
```

### COMPONENTS
```
components/
├── layout/
│   ├── Sidebar.tsx                         → Navigation menu + logout
│   │                                         Props: ProfileWithSubscription
│   └── Header.tsx                          → User avatar + subscription badge
│                                             Props: ProfileWithSubscription
├── ui/
│   ├── StatCard.tsx                        → Metric display card
│   └── EmptyState.tsx                      → No-data placeholder
├── assistant/
│   ├── AssistantWidget.tsx                 → Floating chat button + panel
│   │                                         Props: ProfileWithSubscription
│   └── AssistantChat.tsx                   → Chat interface component
└── auth/
    └── AuthModal.tsx                       → Alternative auth modal (unused?)
```

### LIB
```
lib/
├── supabase/
│   ├── types.ts                            → TypeScript interfaces (REFACTORED)
│   │                                         - CoreProfile, BillingSubscription, CoreDevice
│   │                                         - TimekeeperEntry, TimekeeperGeofence
│   │                                         - ProfileWithSubscription (composite)
│   │                                         - Legacy aliases: Profile, Local, Registro
│   ├── client.ts                           → createBrowserClient() factory
│   └── server.ts                           → createServerClient() factory
├── stripe/
│   ├── client.ts                           → loadStripe() wrapper
│   └── server.ts                           → new Stripe() instance
├── assistant/
│   └── prompts.ts                          → AI assistant context builder
│                                             Uses: ProfileWithSubscription
└── utils.ts                                → Utility functions (see UTILS section)
```

---

## DATABASE_SCHEMA

### TABLE: core_profiles
```sql
-- Primary user table, synced with auth.users via trigger
id                      UUID PRIMARY KEY    -- = auth.users.id
email                   TEXT UNIQUE NOT NULL
full_name               TEXT                -- combined first + last name
avatar_url              TEXT                -- supabase storage URL
first_name              TEXT
last_name               TEXT
preferred_name          TEXT

-- Professional
trade                   TEXT                -- carpenter, framer, electrician, etc.
trade_other             TEXT                -- custom trade if not in list
experience_years        INTEGER
experience_level        TEXT                -- apprentice|journeyman|master|foreman
certifications          TEXT[]              -- array of certifications

-- Employment
employment_type         TEXT                -- employee|contractor|self_employed|business_owner
company_name            TEXT                -- (was: company)
company_size            TEXT                -- solo|2-10|11-50|51-200|200+

-- Location
country                 TEXT DEFAULT 'CA'
province                TEXT
city                    TEXT
postal_prefix           TEXT
timezone                TEXT DEFAULT 'America/Toronto'

-- Language
language_primary        TEXT DEFAULT 'en'
language_secondary      TEXT
language_origin         TEXT

-- Preferences
units_system            TEXT DEFAULT 'imperial' -- imperial|metric
date_format             TEXT DEFAULT 'MM/DD/YYYY'
time_format             TEXT DEFAULT '12h'      -- 12h|24h

-- Onboarding
onboarding_completed_at TIMESTAMPTZ
onboarding_source       TEXT
referral_code           TEXT
referred_by             TEXT

-- Engagement
first_active_at         TIMESTAMPTZ
last_active_at          TIMESTAMPTZ         -- (was: last_seen_at)
total_sessions          INTEGER DEFAULT 0
profile_completeness    INTEGER DEFAULT 0   -- percentage 0-100

-- Timestamps
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()
```

### TABLE: billing_subscriptions
```sql
-- Subscription data per app (separated from profile)
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 UUID REFERENCES core_profiles(id) ON DELETE CASCADE
app_name                TEXT NOT NULL       -- 'calculator' | 'timekeeper'
stripe_customer_id      TEXT
stripe_subscription_id  TEXT
stripe_price_id         TEXT
status                  TEXT DEFAULT 'none' -- none|inactive|trialing|active|past_due|canceled
current_period_start    TIMESTAMPTZ
current_period_end      TIMESTAMPTZ
trial_start             TIMESTAMPTZ
trial_end               TIMESTAMPTZ         -- (was: trial_ends_at)
cancel_at_period_end    BOOLEAN DEFAULT false
canceled_at             TIMESTAMPTZ
cancellation_reason     TEXT
customer_email          TEXT
customer_name           TEXT
customer_phone          TEXT
has_payment_method      BOOLEAN DEFAULT false

-- Billing Address
billing_address_line1   TEXT
billing_address_line2   TEXT
billing_address_city    TEXT
billing_address_state   TEXT
billing_address_postal_code TEXT
billing_address_country TEXT

created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()

UNIQUE(user_id, app_name)
```

### TABLE: core_devices
```sql
-- Device registration (separated from profile)
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 UUID REFERENCES core_profiles(id) ON DELETE CASCADE
device_id               TEXT NOT NULL       -- unique device identifier
device_name             TEXT
platform                TEXT NOT NULL       -- ios|android|web
manufacturer            TEXT
model                   TEXT                -- (was: device_model)
os_version              TEXT
app_name                TEXT
app_version             TEXT
has_gps                 BOOLEAN DEFAULT true
has_microphone          BOOLEAN DEFAULT true
push_token              TEXT
push_enabled            BOOLEAN DEFAULT false
is_primary              BOOLEAN DEFAULT false
is_active               BOOLEAN DEFAULT true
first_seen_at           TIMESTAMPTZ DEFAULT now() -- (was: device_registered_at)
last_active_at          TIMESTAMPTZ
session_count           INTEGER DEFAULT 0
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()

UNIQUE(user_id, device_id)
```

### TABLE: app_timekeeper_entries (was: registros)
```sql
-- Time tracking records (clock in/out)
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 UUID REFERENCES core_profiles(id) ON DELETE SET NULL
geofence_id             UUID REFERENCES app_timekeeper_geofences(id) -- (was: local_id)
location_name           TEXT                -- (was: local_nome) denormalized
entry_at                TIMESTAMPTZ NOT NULL -- (was: entrada) clock in
exit_at                 TIMESTAMPTZ         -- (was: saida) clock out (null = still clocked in)
type                    TEXT DEFAULT 'automatic' -- manual|automatic|voice
entry_method            TEXT                -- manual|geofence|qrcode|nfc|voice|auto_timeout
exit_method             TEXT                -- manual|geofence|qrcode|nfc|voice|auto_timeout
manually_edited         BOOLEAN DEFAULT false -- (was: edited_at IS NOT NULL)
edit_reason             TEXT
original_entry_at       TIMESTAMPTZ         -- (was: original_entrada)
original_exit_at        TIMESTAMPTZ         -- (was: original_saida)
duration_minutes        INTEGER             -- calculated field
pause_minutes           INTEGER DEFAULT 0
notes                   TEXT
tags                    TEXT[]
device_id               TEXT
synced_at               TIMESTAMPTZ
deleted_at              TIMESTAMPTZ         -- soft delete
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()
```

### TABLE: app_timekeeper_geofences (was: locais)
```sql
-- Job site locations for geofencing
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 UUID REFERENCES core_profiles(id) ON DELETE SET NULL
project_id              UUID                -- optional project grouping
name                    TEXT NOT NULL       -- (was: nome)
latitude                NUMERIC NOT NULL
longitude               NUMERIC NOT NULL
radius                  INTEGER DEFAULT 100 -- (was: raio) meters
color                   TEXT DEFAULT '#f59e0b' -- (was: cor)
address_street          TEXT                -- (was: endereco, now split)
address_city            TEXT
address_province        TEXT
address_postal          TEXT
location_type           TEXT                -- residential|commercial|industrial
project_type            TEXT                -- new_construction|renovation|maintenance
status                  TEXT DEFAULT 'active' -- (was: ativo boolean) active|paused|archived
is_favorite             BOOLEAN DEFAULT false
total_entries           INTEGER DEFAULT 0
total_hours             NUMERIC DEFAULT 0
last_entry_at           TIMESTAMPTZ
deleted_at              TIMESTAMPTZ         -- soft delete
synced_at               TIMESTAMPTZ
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()
```

### TABLE: blades_transactions
```sql
-- Rewards ledger (unchanged)
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 UUID REFERENCES core_profiles(id) ON DELETE CASCADE
amount                  INTEGER NOT NULL    -- positive=earn, negative=redeem
type                    TEXT NOT NULL       -- earn|redeem|bonus|adjustment|referral
reason                  TEXT
order_id                TEXT                -- shopify order ref
product_id              TEXT
metadata                JSONB
created_at              TIMESTAMPTZ DEFAULT now()
```

### TABLE: admin_users
```sql
-- Admin access control
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 UUID REFERENCES core_profiles(id) ON DELETE CASCADE
role                    TEXT DEFAULT 'admin' -- admin|super_admin|support
is_active               BOOLEAN DEFAULT true
permissions             JSONB
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()

UNIQUE(user_id)
```

### RLS_POLICIES
```sql
-- core_profiles: user read/write own
CREATE POLICY "user_read_own_profile" ON core_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_update_own_profile" ON core_profiles FOR UPDATE USING (auth.uid() = id);

-- billing_subscriptions: user read own
CREATE POLICY "user_read_own_subscription" ON billing_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- core_devices: user CRUD own
CREATE POLICY "user_own_devices" ON core_devices FOR ALL USING (auth.uid() = user_id);

-- app_timekeeper_entries: user CRUD own records
CREATE POLICY "user_own_entries" ON app_timekeeper_entries FOR ALL USING (auth.uid() = user_id);

-- app_timekeeper_geofences: user CRUD own locations
CREATE POLICY "user_own_geofences" ON app_timekeeper_geofences FOR ALL USING (auth.uid() = user_id);

-- blades_transactions: user read own
CREATE POLICY "user_read_blades" ON blades_transactions FOR SELECT USING (auth.uid() = user_id);

-- admin_users: only admins can read
CREATE POLICY "admin_read" ON admin_users FOR SELECT USING (auth.uid() = user_id);
```

---

## TYPES

### lib/supabase/types.ts
```typescript
// =============================================================================
// ENUMS & TYPE ALIASES
// =============================================================================

export type SubscriptionStatus = 'none' | 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled'
export type UserLevel = 'rookie' | 'apprentice' | 'journeyman' | 'master' | 'legend'
export type BladesTransactionType = 'earn' | 'redeem' | 'bonus' | 'adjustment' | 'referral'
export type DevicePlatform = 'ios' | 'android' | 'web'
export type EntryType = 'manual' | 'automatic' | 'voice'
export type EntryMethod = 'manual' | 'geofence' | 'qrcode' | 'nfc' | 'voice' | 'auto_timeout'

// =============================================================================
// CORE INTERFACES
// =============================================================================

export interface CoreProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  first_name: string | null
  last_name: string | null
  preferred_name: string | null
  trade: string | null
  trade_other: string | null
  experience_years: number | null
  experience_level: 'apprentice' | 'journeyman' | 'master' | 'foreman' | null
  certifications: string[] | null
  employment_type: 'employee' | 'contractor' | 'self_employed' | 'business_owner' | null
  company_name: string | null
  company_size: 'solo' | '2-10' | '11-50' | '51-200' | '200+' | null
  country: string
  province: string | null
  city: string | null
  postal_prefix: string | null
  timezone: string
  language_primary: string
  language_secondary: string | null
  language_origin: string | null
  units_system: 'imperial' | 'metric'
  date_format: string
  time_format: '12h' | '24h'
  onboarding_completed_at: string | null
  onboarding_source: string | null
  referral_code: string | null
  referred_by: string | null
  first_active_at: string | null
  last_active_at: string | null
  total_sessions: number
  profile_completeness: number
  created_at: string
  updated_at: string
}

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
  billing_address_line1: string | null
  billing_address_line2: string | null
  billing_address_city: string | null
  billing_address_state: string | null
  billing_address_postal_code: string | null
  billing_address_country: string | null
  created_at: string
  updated_at: string
}

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

// =============================================================================
// COMPOSITE TYPES (for Dashboard use)
// =============================================================================

/**
 * Profile with subscription data (joined from multiple tables)
 * Used in Dashboard components that need subscription/device/blades info
 */
export interface ProfileWithSubscription extends CoreProfile {
  // From billing_subscriptions
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: SubscriptionStatus
  trial_ends_at?: string | null
  subscription_started_at?: string | null
  subscription_canceled_at?: string | null
  has_payment_method?: boolean

  // From core_devices
  device_id?: string | null
  device_registered_at?: string | null
  device_model?: string | null
  device_platform?: DevicePlatform | null

  // From blades_transactions (aggregated)
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
// LEGACY ALIASES (backward compatibility)
// =============================================================================

/** @deprecated Use CoreProfile instead */
export type Profile = CoreProfile

/** @deprecated Use TimekeeperGeofence instead */
export type Local = TimekeeperGeofence

/** @deprecated Use TimekeeperEntry instead */
export type Registro = TimekeeperEntry
```

---

## API_ROUTES

### POST /api/stripe/checkout
```typescript
// Creates Stripe checkout session
INPUT: none (uses session user)
PROCESS:
  1. getUser() → user.id
  2. Query billing_subscriptions for stripe_customer_id
  3. if !stripe_customer_id → stripe.customers.create()
  4. stripe.checkout.sessions.create({...})
OUTPUT: { url: string }
CALLER: SubscriptionManager.handleAddPaymentMethod()
```

### POST /api/stripe/portal
```typescript
// Creates billing portal session
INPUT: none
PROCESS:
  1. Query billing_subscriptions → stripe_customer_id
  2. stripe.billingPortal.sessions.create({ customer, return_url })
OUTPUT: { url: string }
CALLER: SubscriptionManager.handleManageSubscription()
```

### POST /api/stripe/cancel
```typescript
// Cancels subscription at period end
INPUT: none
PROCESS:
  1. Query billing_subscriptions → stripe_subscription_id
  2. stripe.subscriptions.update(id, { cancel_at_period_end: true })
  3. Update billing_subscriptions({ canceled_at: now() })
OUTPUT: { success: true }
CALLER: SubscriptionManager.handleCancelSubscription()
```

### POST /api/webhooks/stripe
```typescript
// Handles Stripe webhook events
AUTH: signature verification (STRIPE_WEBHOOK_SECRET)
CLIENT: supabase service role (bypasses RLS)
EVENTS:
  - checkout.session.completed:
      → update billing_subscriptions: status, stripe_subscription_id, has_payment_method
  - customer.subscription.updated:
      → update billing_subscriptions: status from event.status
  - customer.subscription.deleted:
      → update billing_subscriptions: status='canceled', canceled_at
  - invoice.payment_succeeded:
      → update billing_subscriptions: status='active'
  - invoice.payment_failed:
      → update billing_subscriptions: status='past_due'
OUTPUT: { received: true }
```

### POST /api/profile/update
```typescript
INPUT: { first_name?, last_name?, company_name?, trade? }
PROCESS:
  supabase.from('core_profiles').update({
    first_name,
    last_name,
    company_name,
    trade,
    full_name: `${first_name} ${last_name}`, // computed
    updated_at
  }).eq('id', user.id)
OUTPUT: { success: true }
CALLER: EditProfileForm.handleSubmit()
```

### POST /api/profile/avatar
```typescript
INPUT: FormData with 'file'
VALIDATION: jpg|png|webp, max 2MB
PROCESS:
  1. upload to supabase.storage.from('avatars')
  2. getPublicUrl()
  3. update core_profiles.avatar_url
OUTPUT: { success: true, avatar_url: string }
CALLER: EditProfileForm.handleAvatarUpload()
```

### POST /api/device/unlink
```typescript
INPUT: none
PROCESS:
  Delete from core_devices WHERE user_id = user.id AND is_primary = true
  OR update is_active = false
OUTPUT: { success: true }
CALLER: DeviceManager.handleUnlink()
```

### PATCH /api/timekeeper/update
```typescript
INPUT: { id: string, field: 'entry_at'|'exit_at', value: string (ISO datetime) }
       // Also accepts legacy: 'entrada'|'saida' (mapped internally)
PROCESS:
  1. Fetch entry from app_timekeeper_entries by id + user_id
  2. if !original_entry_at → save current as original
  3. Update field, set manually_edited = true, updated_at
OUTPUT: updated entry object
CALLER: EditableCell.handleSave()
```

### POST /api/timekeeper/export/excel
```typescript
INPUT: {
  entries: TimekeeperEntry[],
  profile: ProfileWithSubscription,
  dateRange: { start: string, end: string },
  stats: { totalMinutos, diasTrabalhados, totalSessoes, locaisUsados, registrosEditados }
}
PROCESS:
  1. Create workbook with xlsx
  2. Sheet 1 "Summary": worker, period, totals
  3. Sheet 2 "Records": location, date, in (entry_at), out (exit_at), duration, edited
OUTPUT: binary xlsx file
FILENAME: timekeeper-{start}-{end}.xlsx
CALLER: TimekeeperDashboard.handleExportExcel()
```

### POST /api/timekeeper/export/pdf
```typescript
INPUT: same as excel
PROCESS:
  1. Create jsPDF document
  2. Header with brand color bar (#f59e0b)
  3. Worker info section
  4. Stats boxes grid
  5. Locations list
  6. Records table (autoTable)
  7. Highlight manually_edited rows in amber
  8. Footer disclaimer
OUTPUT: binary pdf file
FILENAME: timekeeper-{start}-{end}.pdf
CALLER: TimekeeperDashboard.handleExportPDF()
```

### POST /api/assistant/chat
```typescript
INPUT: { messages: Message[], context: AssistantContext }
PROCESS:
  1. Build system prompt with user context
  2. Call OpenAI API (requires OPENAI_API_KEY)
  3. Stream response
OUTPUT: ReadableStream (SSE)
CALLER: AssistantChat component
```

---

## COMPONENT_SPECS

### app/(dashboard)/layout.tsx
```typescript
SERVER COMPONENT
FETCH:
  1. core_profiles via supabase.from('core_profiles').select('*').eq('id', user.id)
  2. billing_subscriptions via supabase.from('billing_subscriptions')
       .select('*').eq('user_id', user.id).eq('app_name', 'timekeeper')
  3. core_devices via supabase.from('core_devices')
       .select('*').eq('user_id', user.id).eq('is_primary', true)
  4. blades_transactions via supabase.from('blades_transactions')
       .select('amount').eq('user_id', user.id)

COMPOSE: ProfileWithSubscription from all sources

RENDER:
  <div className="flex h-screen">
    <Sidebar profile={profile} />
    <div className="flex-1 flex flex-col">
      <Header profile={profile} />
      <main className="flex-1 overflow-auto p-6 bg-gray-50">
        {children}
      </main>
      <AssistantWidget profile={profile} />
    </div>
  </div>
```

### account/timekeeper/page.tsx
```typescript
SERVER COMPONENT
FETCH:
  1. core_profiles → compose ProfileWithSubscription
  2. billing_subscriptions for subscription_status
  3. app_timekeeper_geofences via supabase.from('app_timekeeper_geofences')
       .select('*').eq('user_id', user.id).is('deleted_at', null)
  4. app_timekeeper_entries via supabase.from('app_timekeeper_entries')
       .select('*').eq('user_id', user.id).is('deleted_at', null)
       .gte('entry_at', ninetyDaysAgo).order('entry_at', { ascending: false })

RENDER:
  <TimekeeperDashboard
    profile={profile}
    entries={entries}      // TimekeeperEntry[]
    geofences={geofences}  // TimekeeperGeofence[]
  />
```

### account/timekeeper/TimekeeperDashboard.tsx
```typescript
'use client'
PROPS: {
  profile: ProfileWithSubscription
  entries: TimekeeperEntry[]
  geofences: TimekeeperGeofence[]
}

STATE:
  entries: TimekeeperEntry[]
  dateRange: { start: Date, end: Date, label?: string }
  showChart: boolean
  editingId: string | null
  isExporting: boolean

MEMOS:
  filteredEntries: filter by dateRange using entry_at
  stats: {
    totalMinutos: sum of (exit_at - entry_at)
    diasTrabalhados: unique days
    totalSessoes: count
    locaisUsados: unique location_name values
    registrosEditados: count where manually_edited = true
  }
  chartData: aggregate hours by day

FUNCTIONS:
  handleUpdateEntry(id, field: 'entry_at'|'exit_at', value):
    → fetch PATCH /api/timekeeper/update
    → update local state

  handleExportExcel/PDF():
    → fetch POST /api/timekeeper/export/{format}
    → download blob

RENDER:
  - Stats cards (using formatMinutesToHours)
  - HoursChart (collapsible)
  - Records table showing:
    - location_name
    - Date from entry_at
    - Clock In (entry_at time)
    - Clock Out (exit_at time)
    - Duration calculated
    - Edit button if exit_at exists
  - Edited rows highlighted with amber background
```

### account/settings/page.tsx
```typescript
SERVER COMPONENT
FETCH:
  1. core_profiles
  2. billing_subscriptions (for timekeeper app)
  3. core_devices (is_primary = true)

COMPOSE ProfileWithSubscription with:
  - subscription_status: subscription?.status ?? 'none'
  - trial_ends_at: subscription?.trial_end
  - has_payment_method: subscription?.has_payment_method
  - stripe_customer_id: subscription?.stripe_customer_id
  - device_id, device_model, device_platform from core_devices
  - device_registered_at: device?.first_seen_at

RENDER:
  - SubscriptionManager (client)
  - DeviceManager (client)
  - Account info
  - Legal links
```

### account/blades/page.tsx
```typescript
SERVER COMPONENT
FETCH:
  blades_transactions via supabase.from('blades_transactions')
    .select('*').eq('user_id', user.id).order('created_at', { ascending: false })

CALCULATE:
  balance = sum of all transaction amounts
  lifetime = sum of positive amounts only
  level = based on lifetime thresholds:
    - 0-99: rookie
    - 100-499: apprentice
    - 500-999: journeyman
    - 1000-4999: master
    - 5000+: legend

RENDER:
  - Balance card with level progress
  - How to earn section
  - Level breakdown
  - Transaction history
```

### components/assistant/AssistantWidget.tsx
```typescript
'use client'
PROPS: { profile: ProfileWithSubscription }

STATE:
  isOpen: boolean
  isVisible: boolean (delayed animation)

LOGIC:
  canUseAssistant = ['trialing', 'active'].includes(profile.subscription_status || '')
  if !canUseAssistant → return null

RENDER:
  - Floating button (bottom-right)
  - Chat panel when open
  - Tooltip "Need help?" on hover
```

---

## MIDDLEWARE

### middleware.ts
```typescript
import { createServerClient } from '@supabase/ssr'

MATCHER: ['/account/:path*', '/admin/:path*']

LOGIC:
  1. Create Supabase client with request cookies
  2. getUser() to validate session
  3. If no user + protected route → redirect to /
  4. If /admin/* route:
     → query admin_users WHERE user_id = user.id
     → if !is_active → redirect to /account
  5. If authenticated:
     → update core_profiles.last_active_at = now()
  6. Return response with updated cookies
```

---

## UTILS

### lib/utils.ts
```typescript
cn(...inputs: ClassValue[]): string
  → clsx + tailwind-merge for class composition

formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string
  → new Date(date).toLocaleDateString('en-CA', options)
  → default: { year: 'numeric', month: 'long', day: 'numeric' }

formatDateTime(date: string | Date): string
  → MM/DD/YYYY HH:mm format (en-CA)

formatCurrency(amount: number, currency = 'CAD'): string
  → Intl.NumberFormat('en-CA', { style: 'currency', currency })

formatMinutesToHours(minutes: number): string
  → "Xh Ymin" format

getInitials(name?: string | null): string
  → First letter of first + last name, uppercase

getFirstName(name?: string | null): string
  → Split by space, return first part

getLevelColor(level: string): string
  → Returns Tailwind classes for blades level badge

getSubscriptionBadge(status: string): { label: string, color: string }
  → Returns display label and Tailwind classes for status
```

---

## ENV_VARS

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...                    # Only for webhooks

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
TRIAL_PERIOD_DAYS=180

# OpenAI (for assistant)
OPENAI_API_KEY=sk-...

# URLs
NEXT_PUBLIC_APP_URL=https://app.onsiteclub.ca
NEXT_PUBLIC_SHOPIFY_URL=https://onsiteclub.ca/shop
NEXT_PUBLIC_CALCULATOR_URL=https://calc.onsiteclub.ca
```

---

## AUTH_FLOW

```
ENTRY: app/page.tsx

1. EMAIL_CHECK
   User enters email → checkEmail()
   → supabase.from('core_profiles').select('email').eq('email', input).single()
   → EXISTS: step='login' | NOT_EXISTS: step='signup'

2a. LOGIN
   → supabase.auth.signInWithPassword({ email, password })
   → SUCCESS: router.push('/account')
   → FAIL: show error

2b. SIGNUP
   → supabase.auth.signUp({ email, password })
   → TRIGGER: handle_new_user() creates core_profiles row
   → supabase.from('core_profiles').update({ full_name }).eq('id', user.id)
   → supabase.auth.signInWithPassword() (auto-login)
   → router.push('/account')

3. PASSWORD_RESET
   → supabase.auth.resetPasswordForEmail({ email, redirectTo: /auth/callback })
   → User clicks email link
   → /auth/callback?token_hash=XXX&type=recovery
   → exchangeCodeForSession()
   → redirect to /reset-password
   → supabase.auth.updateUser({ password })
   → redirect to /account

4. MIDDLEWARE_PROTECTION
   Every request to /account/* or /admin/*:
   → supabase.auth.getUser()
   → NO_USER: redirect to /
   → HAS_USER: allow + update core_profiles.last_active_at
   → /admin/*: additional admin_users.is_active check
```

---

## DATA_FLOW

```
PAGE_LOAD (Server Component):
  app/(dashboard)/account/timekeeper/page.tsx
  → createServerClient()
  → supabase.auth.getUser()
  → supabase.from('app_timekeeper_entries').select().eq('user_id', user.id)
  → supabase.from('app_timekeeper_geofences').select().eq('user_id', user.id)
  → <TimekeeperDashboard entries={entries} geofences={geofences} profile={profile} />

CLIENT_ACTION (Edit Time):
  EditableCell.handleSave()
  → fetch('/api/timekeeper/update', { method: 'PATCH', body: { id, field, value } })
  → API: update app_timekeeper_entries set manually_edited=true
  → TimekeeperDashboard: setEntries(updated)

CLIENT_ACTION (Export):
  TimekeeperDashboard.handleExportPDF()
  → fetch('/api/timekeeper/export/pdf', { method: 'POST', body: { entries, profile, stats } })
  → API: generate PDF with jsPDF → return blob
  → Client: create download link → click → cleanup

STRIPE_WEBHOOK:
  Stripe → POST /api/webhooks/stripe
  → Verify signature
  → createClient() with SERVICE_ROLE_KEY (bypasses RLS)
  → Update billing_subscriptions based on event type
  → Return { received: true }
```

---

## STYLING

```css
/* Brand Colors */
--brand-primary: #f59e0b;     /* amber-500 */
--brand-hover: #d97706;       /* amber-600 */
--brand-light: #fef3c7;       /* amber-100 */
--brand-dark: #92400e;        /* amber-800 */

/* Usage */
.bg-brand-500     /* Primary backgrounds, buttons */
.text-brand-500   /* Highlighted text, icons */
.border-brand-500 /* Active borders, focus rings */
.hover:bg-brand-600 /* Button hover states */

/* Tailwind Config Extension */
colors: {
  brand: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  }
}
```

---

## DEPENDENCIES

```json
{
  "dependencies": {
    "next": "14.2.21",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.47.0",
    "@supabase/ssr": "^0.5.2",
    "stripe": "^14.21.0",
    "@stripe/stripe-js": "^2.4.0",
    "tailwindcss": "^3.4.1",
    "lucide-react": "^0.460.0",
    "recharts": "^2.x",
    "jspdf": "^3.0.4",
    "jspdf-autotable": "^5.0.2",
    "xlsx": "^0.18.5",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.0",
    "openai": "^4.x"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/node": "^20",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33"
  }
}
```

---

## FEATURE_STATUS

| Feature | Status | Files | Tables Used |
|---------|--------|-------|-------------|
| Auth (login/signup/reset) | ✅ LIVE | app/page.tsx, auth/callback | core_profiles |
| Dashboard Hub | ✅ LIVE | account/page.tsx | core_profiles, billing_subscriptions |
| Profile Management | ✅ LIVE | account/profile/* | core_profiles |
| Subscription (Stripe) | ✅ LIVE | account/settings/*, api/stripe/* | billing_subscriptions |
| Device Management | ✅ LIVE | account/settings/DeviceManager | core_devices |
| Timekeeper Dashboard | ✅ LIVE | account/timekeeper/* | app_timekeeper_entries, app_timekeeper_geofences |
| Timekeeper Edit | ✅ LIVE | api/timekeeper/update | app_timekeeper_entries |
| Export Excel | ✅ LIVE | api/timekeeper/export/excel | — |
| Export PDF | ✅ LIVE | api/timekeeper/export/pdf | — |
| Blades Rewards | ✅ LIVE | account/blades/page.tsx | blades_transactions |
| Shop Integration | ✅ LIVE | account/shop/page.tsx | — |
| Calculator Access | ✅ LIVE | account/calculator/page.tsx | — |
| AI Assistant | ✅ LIVE | components/assistant/*, api/assistant | — |
| Courses | 🚧 SOON | account/courses/page.tsx | — |
| Checklist | 🚧 SOON | account/checklist/page.tsx | — |
| Admin Dashboard | 📋 PLANNED | /admin/* routes | admin_users |

---

## COMMON_PATTERNS

### Server Component Page (with new tables)
```typescript
// app/(dashboard)/account/[feature]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientComponent from './ClientComponent'
import type { ProfileWithSubscription } from '@/lib/supabase/types'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Fetch from real table names
  const { data: profile } = await supabase
    .from('core_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('app_name', 'timekeeper')
    .single()

  // Compose ProfileWithSubscription
  const composedProfile: ProfileWithSubscription = {
    ...profile,
    subscription_status: subscription?.status ?? 'none',
    has_payment_method: subscription?.has_payment_method ?? false,
    // ... other fields
  }

  return <ClientComponent profile={composedProfile} />
}
```

### API Route (with new tables)
```typescript
// app/api/[feature]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Use real table name
  const { error } = await supabase
    .from('core_profiles')  // NOT 'profiles'
    .update({ ... })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### Timekeeper Query Pattern
```typescript
// Fetch entries (was: registros)
const { data: entries } = await supabase
  .from('app_timekeeper_entries')
  .select('*')
  .eq('user_id', user.id)
  .is('deleted_at', null)
  .gte('entry_at', startDate)
  .order('entry_at', { ascending: false })

// Fetch geofences (was: locais)
const { data: geofences } = await supabase
  .from('app_timekeeper_geofences')
  .select('*')
  .eq('user_id', user.id)
  .is('deleted_at', null)
  .eq('status', 'active')
```

---

## NOTES

- All timestamps in database are TIMESTAMPTZ (UTC)
- Frontend displays dates in en-CA locale
- Currency is CAD, formatted with en-CA locale
- Geofencing happens in mobile app (React Native), data syncs to Supabase
- PDF export uses OnSite brand colors (#f59e0b header bar)
- Edited time records (manually_edited=true) are visually highlighted in amber
- Trial period is 180 days (6 months)
- Subscription data now in separate billing_subscriptions table
- Device data now in separate core_devices table
- Service role key only used in webhook handler to bypass RLS
- Legacy type aliases (Profile, Local, Registro) maintained for backward compatibility
- Assistant requires OPENAI_API_KEY environment variable

---

*Generated for AI context. Last updated: January 2025*
*Version 4.0 - Post-refactoring to real Supabase table names*
