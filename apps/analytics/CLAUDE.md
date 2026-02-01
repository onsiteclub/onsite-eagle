# Onsite Intelligence - Project Context

## OnSite Club - Ecosystem Overview

**OnSite Club** is an integrated ecosystem of apps for Canada's construction industry.
Motto: *"Wear what you do!"* — built by a carpenter who knows the trade firsthand.

**Central vision:** Collect real daily data from construction workers across specialized apps to train a proprietary AI called **"Prumo"** by 2027. Long-term: AI + robotics on job sites.

### Arquitetura "Ampulheta" (Hourglass Architecture)

The system follows an hourglass model with three layers:

```
     ┌─────────────────────────────────────────┐
     │         COLETA (Topo / Collection)       │
     │    Multiple specialized apps, each       │
     │    capturing specific real-world data     │
     │                                          │
     │  Calculator  Timekeeper  Shop  SheetChat │
     │    (voice)    (GPS/geo)  ($$)  (social)  │
     └──────────────────┬──────────────────────┘
                        │
                        ▼
          ┌─────────────────────────────┐
          │  CENTRALIZACAO (Centro)     │
          │  Supabase unified backend   │
          │  PostgreSQL + RLS + Auth    │
          │  Normalized & secure data   │
          │  agg_* / log_* / int_*     │
          └─────────────┬───────────────┘
                        │
                        ▼
     ┌─────────────────────────────────────────┐
     │      INTELIGENCIA (Base / Output)       │
     │                                          │
     │  Onsite Analytics  ← "olhos e ouvidos"  │
     │    (business health, KPIs, dashboards)   │
     │                                          │
     │  IA Prumo (2027)  ← aprendizado do setor│
     │    (proprietary AI trained on real data)  │
     │                                          │
     │  v_* views  ← insights acionáveis       │
     │    (churn, MRR, health, funnel, etc.)    │
     └─────────────────────────────────────────┘
```

**Data strategy:** Ethical and transparent data collection with LGPD compliance. Each app serves as a specific data collection point for the construction sector.

### Full Ecosystem — Apps & Projects

All projects share the **same Supabase project** (`bjkhofdrzpczgnwxoauk`), same Auth, same database, same RLS policies.

| App | Agent | Stack | Repo | Purpose | Data Captured |
|-----|-------|-------|------|---------|---------------|
| **Timekeeper Mobile** | KRONOS | React Native / Expo | `onsite-timekeeper` | GPS geofencing, auto clock-in/out, push notifications | Work hours, locations, movement patterns |
| **Timekeeper Web** | KRONOS.JR | Next.js 14+ / Vercel | `onsite-timekeeper-web` | Manual hour entry, reports, map management, QR scan | Manual entries, team structures |
| **Calculator** | CEULEN | React Native | `onsite-calculator` | Voice-powered calculator for quick field calculations | Voice patterns, calculation types, trade-specific formulas |
| **Shop** | HERMES | Next.js / Stripe | `onsite-shop` | E-commerce for construction products | Purchase patterns, product demand by trade |
| **SheetChat** | *(TBD)* | *(planned)* | *(planned)* | Messaging & community — "No chitchat. SheetChat" | Social interactions, knowledge sharing, organic growth from Timekeeper base |
| **Auth Hub** | HERMES | — | — | Centralized authentication across all apps | Identity, devices, sessions |
| **Onsite Analytics** | BLUE | Next.js 14+ / Vercel | `onsite-analytics` | Business health dashboard — "olhos e ouvidos" | Reads `agg_*`, `int_*`, `v_*` views, `admin_*` |
| **Onsite Intelligence** | BLUE | — | `onsite-intelligence` | Schema orchestration, migrations, CLAUDE.md memory | Central documentation and database ownership |

**Platform:** Android first, iOS in roadmap.

### Agent Hierarchy (Blueprint System)

```
┌─────────────────────────────────────────────┐
│             BLUEPRINT (Blue)                │
│           Orchestrator Agent                │
│  - Define schemas (SQLs em migrations/)     │
│  - Coordena entre agentes                   │
│  - Mantem documentacao central              │
│  - Onsite Analytics + Intelligence          │
└─────────────────────────────────────────────┘
                    │
     ┌──────────┬───┼───┬──────────┐
     ▼          ▼   ▼   ▼          ▼
┌─────────┐ ┌─────┐ ┌──────┐ ┌─────────┐
│ KRONOS  │ │CEULEN│ │HERMES│ │ (TBD)   │
│Timekeeper│ │Calc  │ │Shop/ │ │SheetChat│
│ (mobile) │ │      │ │ Auth │ │         │
├─────────┤ └──────┘ └──────┘ └─────────┘
│KRONOS.JR│
│  (web)  │
└─────────┘
```

- **Blue** owns schemas/migrations and the intelligence layer. Agents implement code, not tables.
- **KRONOS** docs: `architectures/agents/KRONOS.md`
- **KRONOS.JR** docs: `architectures/agents/KRONOS.JR.md`

### Onsite Analytics — The Hourglass Neck

Onsite Analytics **IS the neck of the hourglass** — it sits between raw data (input) and actionable intelligence (output). It has **two integrated interfaces**, each with 5 spheres.

- **Audience**: Admin/super_admin users only (approval-gated via `admin_users` table)
- **Stack**: Next.js 14+ on Vercel, same Supabase backend
- **Repo**: `onsite-analytics` at `c:/Dev/Onsite-club/onsite-analytics`

```
  ┌─────────────────────────────────────────────────────────────┐
  │                    ONSITE ANALYTICS                         │
  │                 (Gargalo da Ampulheta)                      │
  │                                                             │
  │   ENTRADA (Cyan/Blue)         SAIDA (Amber/Green)          │
  │   ┌─────────────────┐        ┌─────────────────┐          │
  │   │  1. Identity     │        │  1. AI Training  │          │
  │   │  2. Business     │   ──>  │  2. Market Intel │          │
  │   │  3. Product      │   ──>  │  3. App Optimize │          │
  │   │  4. Debug        │   ──>  │  4. Commerce     │          │
  │   │  5. Visual       │        │  5. Reports      │          │
  │   └─────────────────┘        └─────────────────┘          │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
```

#### INPUT Interface — "Entrada" (Color: Cyan/Blue)

Analyzes raw data flowing in from apps. "What is happening?"

| Sphere | Purpose | Data Sources |
|--------|---------|--------------|
| **Identity** | Who are the users? Cohorts, demographics, churn | `core_profiles`, `core_devices`, `v_churn_risk`, `v_user_health` |
| **Business** | Value generated. Sessions, hours, locations, revenue | `app_timekeeper_entries`, `billing_subscriptions`, `payment_history`, `v_mrr`, `v_revenue_by_province` |
| **Product** | UX & engagement. Features, onboarding, funnels | `log_events`, `agg_user_daily`, `v_subscription_funnel` |
| **Debug** | System health. Errors, sync, GPS accuracy | `log_errors`, `app_logs`, `v_top_errors` |
| **Visual** | Photo analysis. Construction site imagery, defect detection training | `visual_events`, `image_annotations`, `error_taxonomy` *(planned tables)* |

#### OUTPUT Interface — "Saida" (Color: Amber/Green)

Transforms analyzed data into actionable outputs. "What should we do?"

| Sphere | Purpose | Output Format |
|--------|---------|---------------|
| **AI Training** | Export datasets formatted for ML training (Prumo) | COCO JSON, CSV, `.onnx`-ready datasets. Versioned, validated, archived |
| **Market Intel** | Predictions, trends, demand forecasting | Dashboards, alerts, seasonal patterns by trade/province |
| **App Optimize** | Insights that feed back into apps | Feature flags, UX recommendations, onboarding improvements |
| **Commerce** | Pricing, product demand, conversion optimization | Shop product recommendations, pricing by trade, Stripe insights |
| **Reports** | Automated reports, executive summaries | Scheduled PDF/CSV exports, email digests, KPI snapshots |

#### UI Design

- **Sidebar** split in two sections with visual separator
- **Input spheres**: cyan/blue accent color
- **Output spheres**: amber/green accent color
- **Tools** (ARGUS, Queries, Support): neutral, below both sections
- Each sphere is a full dashboard page with its own charts, tables, KPIs

---

## Strategic Vision & Roadmap

### IA Prumo — Proprietary AI (Target: 2027+)

Prumo is the long-term AI goal of OnSite Club. Each app in the ecosystem is a **data collection point** feeding into a future construction-specific AI.

**What Prumo will know (trained on real data):**
- Visual recognition: good wood vs scrap, structural errors, finishing defects
- Voice patterns: how construction workers speak (informal terms, multilingual)
- Work patterns: hours, productivity, seasonal trends by trade/province
- Calculation patterns: what formulas are used by which trades
- Quality patterns: common defects, costs, fix times

**Training approach:** Similar to Tesla Autopilot — collect data for years, train model when dataset is large enough. Human-in-the-loop validation (supervisor confirms/corrects AI detections).

### Visual Intelligence — Photo Data Architecture

Founder has 100GB+ of construction site photos (errors, materials, processes) collected over years as a supervisor. These need structured annotation to become training data.

**Principles (anti-garbage data):**
1. **Separation**: Storage (R2/S3 for photos, immutable) vs Metadata (Supabase for annotations, mutable)
2. **Standard format**: COCO JSON for annotations (bbox + categories) — industry standard for ML
3. **Fixed taxonomy**: Official error categories, not ad-hoc labels
4. **Complete metadata**: WHO/WHERE/WHEN always captured
5. **Versioned annotations**: Can be corrected over time, track which annotator (human vs AI version)
6. **Human validation**: At least 20% of photos validated by human

**Planned tables (not yet created):**
- `visual_events` — photos with context (site, room, phase, GPS, AI analysis, severity)
- `image_annotations` — versioned annotations per image (COCO format, bbox, category, confidence)
- `error_taxonomy` — standardized defect categories (structural, finishing, electrical, etc.)

**Storage strategy:** Cloudflare R2 for photos ($0.015/GB, zero egress), Supabase for metadata.

**Annotation workflow:**
1. Claude Vision pre-annotates (detects errors, draws bbox, suggests category)
2. Human validates/corrects (5s if correct, 30s if wrong)
3. Saves with provenance: `suggested_by: "claude_vision"`, `verified_by: "cris"`
4. Estimated: 65 hours hybrid vs 1000 hours fully manual for 20k photos

**Starter categories (expand over time):**
- `wood_useful` / `wood_scrap` — material sorting
- `load_point` — structural load bearing points
- `error_structural` — plumb, level, structural integrity
- `error_finishing` — paint, drywall, surface defects
- `safety_hazard` — exposed wires, holes, missing guards

### Robotics Strategy — Kepler K2

**Bet:** In 10 years, humanoid robots + human workers will be cheaper and more versatile than 3D printing or prefab for residential construction. The "trained eye" of a carpenter is the differentiator — Prumo AI gives that eye to a robot.

**Target hardware:** Kepler K2 "Bumblebee" (Shanghai Kepler Robotics)
- Price: ~CA$45k (RMB 248,000) — already in mass production (2025)
- Specs: 178cm, 85kg, 30kg payload, 8h battery, 12 DoF hands
- **Open SDK**: developer platform, APIs for cameras/motors/sensors, custom AI models supported
- Can load custom `.onnx` models via USB/Wi-Fi/cloud
- Comparable to Android (open) vs Tesla Optimus (closed/iPhone)

**What Kepler can do for construction today:** carry materials, organize, hold pieces, clean debris
**What it can't yet:** finishing, electrical, plumbing, complex decisions

**Timeline:**
- 2025-2026: Collect/annotate data, build training dataset
- 2027: Test Kepler with custom Prumo model
- 2028-2030: Iterate, roboto works alongside human
- 2030+: Competitive advantage — robot trained on years of real Canadian construction data

### SheetChat — Construction Communication (Planned)

**Tagline:** "No chitchat. SheetChat."

**Problem identified:** In Canadian construction, supervisor uses SMS/iMessage, Brazilian worker uses WhatsApp, Filipino uses Messenger/Viber. 4 apps = chaos, lost messages, zero team cohesion.

**Solution:** Unified messaging app with:
- **Auto-translation**: write in English, worker sees in Portuguese/Tagalog/Spanish
- **Construction context**: messages linked to projects, locations, checklists, photos
- **Belonging features**: crew feeds, achievements, recognition, light gamification
- **Integration**: auto-posts from Timekeeper ("John arrived at Site 12"), shared calculations from Calculator

**Strategic value:**
- Organic growth from Timekeeper user base
- Data collection: communication patterns, recurring problems, training needs
- Reduces turnover through belonging/community
- Bridges language/cultural gaps common in Canadian construction

**Status:** Planned. No agent assigned yet. No repo yet.

---

### QR Code Sharing (Team Linking v3.2)

Workers share hours with Managers via QR code. Access is **immediate** (no approval step).

```
Worker: "Share My Hours"
  → creates pending_token (5 min TTL)
  → displays QR code
                          Manager: "Scan QR Code"
                            → reads token
                            → creates access_grant (status='active')
                            → deletes pending_token
                            → RLS grants SELECT on entries + geofences
```

Tables with shared access via access_grants RLS:
- `app_timekeeper_entries` — "Viewer see shared records"
- `app_timekeeper_geofences` — "Viewer see shared locations"

Views used by web (backward-compat): `records`, `locations`, `profiles`

### Table Ownership by Agent

| Agent | Tables (direct) | Views used |
|-------|----------------|------------|
| **KRONOS** (mobile) | `app_timekeeper_entries`, `app_timekeeper_geofences`, `app_timekeeper_projects`, `core_profiles`, `core_devices`, `access_grants`, `pending_tokens`, `agg_user_daily`, `log_errors`, `log_events`, `log_locations` | — |
| **KRONOS.JR** (web) | `access_grants`, `pending_tokens` | `records`, `locations`, `profiles` (backward-compat views) |
| **CEULEN** (calculator) | `app_calculator_calculations`, `app_calculator_templates`, `calculations`, `voice_logs`, `log_voice`, `ref_units` | — |
| **HERMES** (shop/billing) | `app_shop_*`, `categories`, `billing_*`, `payment_history`, `checkout_codes` | `subscriptions` |
| **Blue** (intelligence) | `agg_platform_daily`, `agg_trade_weekly`, `int_behavior_patterns`, `int_voice_patterns`, `admin_users`, `admin_logs` | `v_*` views |
| **Blue** (analytics) | *reads only* | `v_churn_risk`, `v_mrr`, `v_revenue_by_province`, `v_subscription_funnel`, `v_top_errors`, `v_user_health`, `v_voice_adoption_by_trade`, `v_daily_platform_metrics` |
| **Shared** | `core_profiles`, `core_consents`, `ref_trades`, `ref_provinces`, `app_logs` | — |
| **Argus** (AI) | `argus_conversations` | — |
| **(TBD)** (SheetChat) | *(planned)* | — |

**[DIRECTIVE 2026-01-27] KRONOS.JR must migrate to real table names:**
- ~~`profiles`~~ → `core_profiles`
- ~~`records`~~ → `app_timekeeper_entries`
- ~~`geofences`/`locations`~~ → `app_timekeeper_geofences`
- Documentation updated. Code migration pending in `onsite-timekeeper-web` repo.
- Backward-compat views remain in Supabase but should not be used in new code.

---

## Supabase Database Schema

### Naming Conventions
- `core_` = identity & user foundation
- `app_` = feature-specific tables (timekeeper, calculator, shop)
- `ref_` = reference/lookup data
- `log_` = observability & event tracking
- `agg_` = pre-aggregated analytics
- `int_` = intelligence/ML pattern tables
- `v_` = materialized/analytical views

---

### Core / Identity

#### core_profiles
- `id` uuid PK (= auth.users.id)
- `email`, `full_name`, `first_name`, `last_name`, `preferred_name`, `avatar_url`
- `trade_id` uuid FK -> ref_trades, `trade_other`, `experience_years`, `experience_level`
- `certifications` text[], `employment_type`, `company_name`, `company_size`, `hourly_rate_range`
- `country` varchar default, `province`, `city`, `postal_code_prefix`, `timezone`
- `language_primary` varchar default, `language_secondary`, `language_origin`
- `voice_enabled` bool, `voice_language_preference`
- `units_system` text default, `date_format`, `time_format`
- `primary_device_id`, `primary_device_model`, `primary_device_platform`
- `onboarding_completed_at`, `onboarding_source`, `referral_code`, `referred_by_user_id`
- `first_active_at`, `last_active_at`, `total_sessions`, `total_hours_tracked`, `profile_completeness`
- `created_at`, `updated_at`

#### core_devices
- `id` uuid PK, `user_id` uuid FK, `device_id` text, `device_name`
- `platform`, `manufacturer`, `model`, `os_version`
- `app_name`, `app_version`
- `has_gps`, `has_microphone`, `has_notifications`
- `push_token`, `push_enabled`, `push_token_updated_at`
- `is_primary`, `is_active`, `first_seen_at`, `last_active_at`, `session_count`
- `created_at`, `updated_at`

#### core_consents
- `id` uuid PK, `user_id` uuid FK, `consent_type`, `document_version`, `document_url`, `document_hash`
- `granted` bool, `granted_at`, `revoked_at`, `expires_at`
- `ip_address` inet, `user_agent`, `app_name`, `app_version`, `collection_method`
- `created_at`

#### consents (legacy)
- `id` uuid PK, `user_id`, `consent_type`, `granted`, `granted_at`, `revoked_at`
- `document_version`, `ip_address`, `user_agent`, `app_version`
- `created_at`, `updated_at`

---

### Admin

#### admin_users
- `id` uuid PK, `user_id` uuid FK, `email`, `name`
- `role` text default, `permissions` jsonb default
- `is_active` bool, `approved` bool, `approved_at`, `approved_by`
- `created_at`, `updated_at`

#### admin_logs
- `id` uuid PK, `admin_id` uuid FK, `action`, `entity_type`, `entity_id`
- `details` jsonb, `ip_address` inet, `user_agent`
- `created_at`

---

### Timekeeper (Time Tracking / Hours)

#### app_timekeeper_entries
- `id` uuid PK, `user_id` uuid FK NOT NULL
- `geofence_id` uuid FK, `geofence_name`, `project_id` uuid FK
- `entry_at` timestamptz NOT NULL, `exit_at`, `pause_minutes` default 0, `duration_minutes`
- `entry_method` text NOT NULL, `exit_method`
- `is_manual_entry` bool, `manually_edited` bool, `edit_reason`
- `original_entry_at`, `original_exit_at`, `integrity_hash`
- `notes`, `tags` text[], `device_id`
- `client_created_at`, `synced_at`, `created_at`, `updated_at`, `deleted_at` (soft delete)

#### app_timekeeper_geofences
- `id` uuid PK, `user_id` uuid FK NOT NULL
- `name` text NOT NULL, `description`, `color` default, `icon`
- `latitude` double NOT NULL, `longitude` double NOT NULL, `radius` int default
- `address_street`, `address_city`, `address_province`, `address_postal_code`
- `location_type`, `project_type`, `status` default
- `is_favorite` bool, `total_entries` int, `total_hours` numeric, `last_entry_at`
- `synced_at`, `created_at`, `updated_at`, `deleted_at` (soft delete)

#### app_timekeeper_projects
- `id` uuid PK, `user_id` uuid FK NOT NULL
- `name` NOT NULL, `description`, `client_name`, `color`
- `project_type`, `building_type`
- `estimated_hours`, `estimated_start_date`, `estimated_end_date`
- `actual_hours` default 0, `actual_start_date`, `actual_end_date`
- `status` default, `budget_amount`, `hourly_rate`
- `created_at`, `updated_at`, `deleted_at` (soft delete)

---

### Calculator

#### app_calculator_calculations
- `id` uuid PK, `user_id` uuid FK
- `calculation_type` NOT NULL, `calculation_subtype`
- `input_values` jsonb NOT NULL, `result_value` numeric, `result_unit`, `formula_used`
- `input_method` NOT NULL (manual/voice), `voice_log_id` uuid FK
- `template_id` uuid FK, `trade_context`
- `was_successful`, `was_saved`, `was_shared`
- `created_at`

#### app_calculator_templates
- `id` uuid PK, `name` NOT NULL, `description`, `category` NOT NULL
- `trade_id` uuid FK, `formula` NOT NULL, `input_fields` jsonb NOT NULL, `default_values` jsonb
- `is_system` bool, `created_by_user_id`, `is_public` bool, `use_count`
- `created_at`, `updated_at`

#### calculations (legacy/alternate)
- `id` uuid PK, `user_id`, `calc_type` NOT NULL, `calc_subtype`
- `input_expression` NOT NULL, `input_values` jsonb, `result_value`, `result_unit`, `result_formatted`
- `input_method` NOT NULL, `voice_log_id`, `template_id`, `trade_context`
- `was_successful`, `was_saved`, `was_shared`
- `device_id`, `app_version`, `created_at`

---

### Shop / E-commerce

#### app_shop_products
- `id` uuid PK, `sku`, `name` NOT NULL, `slug` NOT NULL, `description`
- `category_id` uuid FK, `target_trades` text[]
- `base_price` numeric NOT NULL, `compare_at_price`, `cost_price`
- `images` text[], `has_variants` bool, `sizes` text[], `colors` text[]
- `track_inventory` bool, `inventory_quantity`, `allow_backorder`
- `is_active`, `is_featured`, `is_published`
- `meta_title`, `meta_description`, `sort_order`, `total_sold`, `total_revenue`
- `created_at`, `updated_at`

#### app_shop_product_variants
- `id` uuid PK, `product_id` uuid FK NOT NULL
- `sku`, `name` NOT NULL, `size`, `color`
- `price` numeric NOT NULL, `compare_at_price`, `inventory_quantity`
- `is_active`, `sort_order`
- `created_at`, `updated_at`

#### app_shop_categories
- `id` uuid PK, `name` NOT NULL, `slug` NOT NULL, `description`
- `parent_id` uuid FK (self-ref), `image_url`
- `is_active`, `sort_order`
- `created_at`, `updated_at`

#### app_shop_orders
- `id` uuid PK, `user_id` uuid FK, `order_number` varchar NOT NULL
- `status` default, `subtotal` NOT NULL, `shipping`, `tax`, `discount`, `total` NOT NULL, `currency` default
- `shipping_address` jsonb, `billing_address` jsonb
- `stripe_session_id`, `stripe_payment_intent_id`, `paid_at`
- `shipping_method`, `tracking_number`, `shipped_at`, `delivered_at`
- `customer_notes`, `internal_notes`
- `created_at`, `updated_at`

#### app_shop_order_items
- `id` uuid PK, `order_id` uuid FK NOT NULL, `product_id` uuid FK NOT NULL
- `variant_id` uuid FK, `size`, `color`
- `quantity` int NOT NULL, `unit_price` numeric NOT NULL, `total_price` numeric NOT NULL
- `product_name` NOT NULL, `product_sku`
- `created_at`

#### app_shop_carts
- `id` uuid PK, `user_id` uuid FK, `session_id`
- `items` jsonb default, `subtotal` default
- `expires_at`, `created_at`, `updated_at`

---

### Billing / Subscriptions (Stripe)

#### billing_products
- `id` uuid PK, `app_name` NOT NULL, `name` NOT NULL, `description`
- `stripe_product_id`, `stripe_price_id` NOT NULL
- `price_amount` int NOT NULL, `price_currency` default, `billing_interval`
- `features` jsonb, `limits` jsonb, `is_active`
- `created_at`, `updated_at`

#### billing_subscriptions
- `id` uuid PK, `user_id` uuid FK NOT NULL, `app_name` NOT NULL
- `plan_id` uuid FK, `plan_name`
- `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`
- `status` NOT NULL default, `current_period_start`, `current_period_end`
- `trial_start`, `trial_end`, `cancel_at_period_end`, `cancelled_at`, `cancellation_reason`
- `customer_email`, `customer_name`, `customer_phone`
- `billing_address` jsonb + individual billing_address_* fields
- `created_at`, `updated_at`

#### payment_history
- `id` uuid PK, `user_id` uuid FK NOT NULL, `app_name` NOT NULL
- `stripe_customer_id`, `stripe_subscription_id`, `stripe_invoice_id`, `stripe_payment_intent_id`
- `amount` int, `currency` default, `status`
- `billing_name`, `billing_email`, `billing_phone`, billing_address_* fields
- `paid_at`, `created_at`

#### checkout_codes
- `code` text PK, `user_id` uuid FK NOT NULL, `email` NOT NULL
- `app` default, `created_at`, `expires_at` NOT NULL, `used` bool, `redirect_url`

---

### Voice

#### voice_logs / log_voice (same structure)
- `id` uuid PK, `user_id` uuid FK, `app_name` default, `feature_context`, `session_id`
- Audio: `audio_storage_path`, `audio_duration_ms`, `audio_sample_rate`, `audio_format`
- Transcription: `transcription_raw`, `transcription_normalized`, `transcription_engine`, `transcription_confidence`
- Language: `language_detected`, `language_confidence`, `dialect_region`
- Intent: `intent_detected`, `intent_confidence`, `intent_fulfilled`
- NLP: `entities` jsonb, `informal_terms` jsonb
- Quality: `background_noise_level`, `background_noise_type`, `speech_clarity`
- Result: `was_successful`, `error_type`, `error_message`
- Correction: `user_corrected`, `user_correction`, `correction_applied_at`
- Retry: `retry_count`, `retry_of_id`
- Device: `device_model`, `os`, `app_version`, `microphone_type`
- Location: `latitude`, `longitude`
- `client_timestamp`, `created_at`

---

### Logs / Observability

#### app_logs
- `id` uuid PK, `created_at`, `user_id`, `level`, `module`, `action`, `message`
- `context` jsonb, `device_info` jsonb, `ip`, `user_agent`
- `duration_ms`, `success`, `app_name`, `app_version`

#### log_errors
- `id` uuid PK, `user_id`, `error_type` NOT NULL, `error_code`, `error_message` NOT NULL, `error_stack`
- `app_name` NOT NULL, `screen_name`, `action_attempted`, `error_context` jsonb
- `device_model`, `platform`, `os_version`, `app_version`, `network_type`
- `occurred_at` NOT NULL, `created_at`

#### log_events
- `id` uuid PK, `user_id`, `event_name` NOT NULL, `event_category`
- `app_name` NOT NULL, `screen_name`, `feature_name`
- `properties` jsonb, `success`, `error_message`, `duration_ms`
- `device_id`, `device_model`, `platform`, `os_version`, `app_version`
- `session_id`, `country`, `province`, `client_timestamp`, `created_at`

#### log_locations
- `id` uuid PK, `user_id` NOT NULL, `session_id`, `entry_id`, `geofence_id`
- `event_type` NOT NULL, `trigger_type`
- `latitude` double NOT NULL, `longitude` double NOT NULL, `accuracy`, `altitude`, `heading`, `speed`
- `geofence_name`, `distance_from_center`
- `occurred_at` NOT NULL, `created_at`, `synced_at`

---

### Aggregations

#### agg_platform_daily (PK: date)
- Users: `total_users`, `new_users`, `active_users`, `churned_users`, `users_free`, `users_paid`
- Timekeeper: `total_entries`, `total_work_hours`, `entries_manual_pct`, `entries_auto_pct`
- Calculator: `total_calculations`, `calculations_voice_pct`, `voice_success_rate`
- Shop: `total_orders`, `total_revenue`, `avg_order_value`
- Health: `total_errors`, `crash_rate`, `avg_session_duration`, `avg_sessions_per_user`

#### agg_trade_weekly (PK: week_start + trade_id + province)
- `active_users`, `new_users`, `total_work_hours`, `avg_hours_per_user`, `median_hours_per_user`
- `peak_start_hour`, `peak_end_hour`, `avg_session_duration`
- `voice_usage_pct`, `top_intents` jsonb, `common_terms` jsonb, `sample_size`

#### agg_user_daily (PK: date + user_id)
- App: `app_opens`, `app_foreground_seconds`, `sessions_count`
- Work: `work_entries_count`, `work_entries_manual`, `work_entries_auto`, `work_minutes_total`
- Geo: `geofences_created`, `geofences_deleted`, `geofence_triggers`, `geofence_accuracy_avg`
- Calc: `calculations_count`, `calculations_voice`, `calculations_manual`, `voice_success_rate`
- Shop: `orders_count`, `orders_total`, `cart_abandonment`
- Engagement: `features_used` jsonb, `screens_viewed` jsonb, `notifications_shown`, `notifications_actioned`
- Sync: `sync_attempts`, `sync_failures`
- Health: `errors_count`, `app_version`, `os`, `device_model`

---

### Intelligence

#### int_behavior_patterns
- `id` uuid PK, `segment_type`, `segment_value`, `period_type`, `period_start`, `period_end`
- `avg_hours_per_week`, `median_hours_per_week`, `std_dev_hours`
- `peak_work_day`, `peak_start_hour`, `peak_end_hour`
- `avg_sessions_per_week`, `feature_adoption` jsonb, `sample_size`

#### int_voice_patterns
- `id` uuid PK, `pattern_type`, `raw_form`, `normalized_form`
- `language`, `dialect_region`, `trade_context`
- `occurrence_count`, `unique_users_count`, `confidence_avg`
- `variations` jsonb, `is_validated`, `validated_by`, `validated_at`
- `first_seen_at`, `last_seen_at`

---

### Reference / Lookup

#### ref_trades
- `id` uuid PK, `code` varchar, `name_en`/`name_fr`/`name_pt`/`name_es`
- `category`, `subcategory`, `parent_trade_id` (self-ref)
- `description_en`/`description_fr`
- `common_tools` text[], `common_materials` text[], `common_calculations` text[]
- `is_active`, `sort_order`

#### ref_provinces
- `id` uuid PK, `code` varchar, `country` default, `name_en`, `name_fr`
- `timezone`, `has_red_seal`, `min_wage`, `overtime_threshold`, `is_active`

#### ref_units
- `id` uuid PK, `code`, `symbol`, `name_en`/`name_fr`/`name_pt`
- `unit_type`, `system` (metric/imperial), `base_unit_code`, `conversion_factor`
- `spoken_variations` jsonb, `is_active`

---

### Access / Sharing

#### access_grants
- `id` uuid PK, `owner_id` uuid NOT NULL, `viewer_id` uuid NOT NULL
- `token` varchar NOT NULL, `status` default, `label`
- `created_at`, `accepted_at`, `revoked_at`

#### pending_tokens
- `id` uuid PK, `owner_id` uuid NOT NULL, `token` varchar NOT NULL
- `owner_name`, `expires_at` NOT NULL, `created_at`

---

### AI / Conversations

#### argus_conversations
- `id` uuid PK, `user_id` uuid NOT NULL
- `title`, `messages` jsonb NOT NULL default []
- `starred` bool, `archived` bool
- `created_at`, `updated_at`

---

### Views

| View | Source | Purpose |
|---|---|---|
| `profiles` | core_profiles | Backward-compat view |
| `records` | app_timekeeper_entries | Backward-compat view |
| `locations` | app_timekeeper_geofences | Backward-compat view |
| `subscriptions` | billing_subscriptions | Backward-compat view (excludes new billing_address_* fields) |
| `analytics_daily` | agg_user_daily | Backward-compat view |
| `core_consents_active` | core_consents | Active consents only |
| `v_churn_risk` | core_profiles + billing_subscriptions | Churn risk scoring |
| `v_daily_platform_metrics` | core_profiles + calculations + voice_logs + entries + errors | Daily KPIs |
| `v_mrr` | billing_subscriptions + billing_products | MRR/ARR by app |
| `v_revenue_by_province` | payment_history + core_profiles + ref_provinces | Revenue by province |
| `v_subscription_funnel` | billing_subscriptions | Conversion funnel |
| `v_top_errors` | log_errors | Top errors by frequency |
| `v_user_health` | core_profiles + calculations + voice_logs + entries | User health score |
| `v_voice_adoption_by_trade` | ref_trades + core_profiles + voice_logs | Voice adoption by trade |

---

### Key Relationships
- `core_profiles.id` = `auth.users.id` (1:1)
- `core_profiles.trade_id` -> `ref_trades.id`
- `app_timekeeper_entries.user_id` -> `core_profiles.id`
- `app_timekeeper_entries.geofence_id` -> `app_timekeeper_geofences.id`
- `app_timekeeper_entries.project_id` -> `app_timekeeper_projects.id`
- `app_calculator_calculations.voice_log_id` -> `voice_logs.id`
- `app_calculator_calculations.template_id` -> `app_calculator_templates.id`
- `app_shop_orders.user_id` -> `core_profiles.id`
- `app_shop_order_items.order_id` -> `app_shop_orders.id`
- `app_shop_order_items.product_id` -> `app_shop_products.id`
- `app_shop_products.category_id` -> `app_shop_categories.id`
- `billing_subscriptions.user_id` -> `core_profiles.id`
- `billing_subscriptions.plan_id` -> `billing_products.id`
- `payment_history.user_id` -> `core_profiles.id`

### Multi-app Architecture
The platform supports multiple apps via `app_name` field:
- Billing, logs, events, and subscriptions are scoped per app
- Apps share the same `core_profiles` and `core_devices`

### Soft Deletes
Tables using `deleted_at` for soft delete:
- `app_timekeeper_entries`
- `app_timekeeper_geofences`
- `app_timekeeper_projects`

### PostGIS Enabled
- `spatial_ref_sys`, `geometry_columns`, `geography_columns` present
- Location data stored as lat/lng doubles in relevant tables

---

## Security Audit (2026-01-27)

### RLS Status
- **40/41 tables** have RLS enabled
- `spatial_ref_sys` (PostGIS system table) — RLS **disabled** (ERROR)
- `checkout_codes` — RLS enabled, policies added (SELECT + UPDATE own codes) — **FIX READY**

### Known Issues

| Priority | Table | Issue |
|----------|-------|-------|
| ~~**P0**~~ | ~~`admin_users`~~ | ~~SELECT policy `"Allow read for authenticated users"` uses `qual=true` — leaks all admin emails/roles/permissions to any authenticated user~~ — **FIXED 2026-01-27**: All 6 old policies dropped (including self-referencing `admin_users_select` causing 500 errors). Created `SECURITY DEFINER` helpers (`is_active_admin()`, `is_super_admin()`) + 5 clean policies: own SELECT, admin SELECT all, self INSERT, super_admin UPDATE/DELETE |
| ~~**P0**~~ | ~~`pending_tokens`~~ | ~~SELECT policy `"Anyone can read token"` uses `qual=true` — anyone (including anon) can list ALL pending QR tokens~~ — **FIX READY** (`supabase-security-fixes.sql`): Drop open SELECT, owner-only ALL policy + `lookup_pending_token()` SECURITY DEFINER function for safe QR scanning |
| ~~**P1**~~ | ~~`app_logs`~~ | ~~INSERT policy `"Anyone can insert logs"` uses `WITH CHECK (true)` — anyone can insert logs with spoofed user_ids~~ — **FIX READY** (`supabase-security-fixes.sql`): Drop public INSERT, restrict to authenticated + `user_id = auth.uid()` |
| ~~**P1**~~ | ~~`core_profiles`~~ | ~~INSERT policy allows `auth.uid() IS NULL` — unauthenticated users can potentially create profiles~~ — **FIX READY** (`supabase-security-fixes.sql`): Recreate INSERT policy with `TO authenticated` + `id = auth.uid()` |
| ~~**P1**~~ | ~~`checkout_codes`~~ | ~~RLS enabled but no policies — table is completely inaccessible~~ — **FIX READY** (`supabase-security-fixes.sql`): Added SELECT + UPDATE policies for own codes (INSERT via service_role) |
| ~~**P2**~~ | ~~Multiple log tables~~ | ~~Policies use role `{public}` instead of `{authenticated}` — anon role can insert/read logs~~ — **FIX READY** (`supabase-security-fixes.sql`): All log_errors, log_events, log_voice, log_locations policies recreated with `TO authenticated` |
| ~~**P2**~~ | ~~`access_grants`~~ | ~~Redundant/overlapping PERMISSIVE policies (6 policies)~~ — **FIXED 2026-01-27**: cleaned to 5 specific policies (Owner: SELECT/UPDATE/DELETE, Viewer: INSERT active/SELECT) |
| ~~**P2**~~ | ~~`app_timekeeper_projects`~~ | ~~Missing shared-access policy — viewer cannot see owner's projects~~ — **FIX READY** (`supabase-security-fixes.sql`): Added "Viewer can see shared projects" via access_grants (same pattern as entries/geofences) |
| ~~**P2**~~ | ~~`core_profiles`~~ | ~~Missing shared-access policy~~ — **FIXED 2026-01-27**: `profiles_select_own_or_shared` allows viewer with active access_grant to see owner's profile |
| ~~**P3**~~ | ~~4 functions~~ | ~~`search_path` not set: `update_updated_at_column`, `calculate_entry_duration`, `cleanup_expired_checkout_codes`, `generate_checkout_code`~~ — **FIX READY** (`supabase-security-fixes.sql`): `SET search_path = public` on all 4 functions |
| **P3** | `postgis` | Extension installed in `public` schema — should be in `extensions` — **MANUAL**: requires careful migration and testing, see `supabase-security-fixes.sql` comments |
| **P3** | Auth | Leaked password protection (HaveIBeenPwned) is disabled — **MANUAL**: Enable in Supabase Dashboard > Authentication > Settings > Security |

### RLS Policy Summary (per table)

**Timekeeper (shared via access_grants):**
- `app_timekeeper_entries`: own data (ALL) + viewer shared records (SELECT where grant active)
- `app_timekeeper_geofences`: own data (ALL) + viewer shared locations (SELECT where grant active)
- `app_timekeeper_projects`: own data (ALL) + viewer shared projects (SELECT where grant active) — **FIX READY**

**Core:**
- `core_profiles`: own data (SELECT/INSERT/UPDATE) + viewer shared profile (SELECT where grant active)
- `core_devices`: own data (ALL)
- `core_consents`: own data (INSERT/SELECT)

**Admin:**
- `admin_users`: own record SELECT + active admins SELECT all (via `is_active_admin()` SECURITY DEFINER), self INSERT, super_admin UPDATE/DELETE (via `is_super_admin()` SECURITY DEFINER)
- `admin_logs`: active admins only (INSERT/SELECT)

**Calculator:**
- `app_calculator_calculations`: own data or null user_id (INSERT/SELECT)
- `app_calculator_templates`: system/public templates readable, own templates writable

**Shop:**
- `app_shop_products/variants/categories`: public SELECT (active/published), admin ALL
- `app_shop_orders`: own data + anon guest checkout
- `app_shop_carts`: own data (authenticated)

**Billing:**
- `billing_products`: public SELECT (active only)
- `billing_subscriptions`: own data (SELECT only)
- `payment_history`: own data (SELECT only, authenticated)

**Sharing:**
- `access_grants`: owner (SELECT/UPDATE/DELETE) + viewer (INSERT active only/SELECT)
- `pending_tokens`: owner ALL + `lookup_pending_token()` SECURITY DEFINER for scanning — **FIX READY**

**Aggregations/Intelligence:**
- `agg_platform_daily`, `agg_trade_weekly`, `int_behavior_patterns`: admin only (super_admin/admin/analyst)
- `agg_user_daily`: own data (INSERT/SELECT/UPDATE)

**Logs:**
- `app_logs`: authenticated only — own SELECT + own INSERT (`user_id = auth.uid()`) — **FIX READY**
- `log_errors`, `log_events`, `log_voice`: authenticated only — own or null user_id (INSERT/SELECT) — **FIX READY**
- `log_locations`: authenticated only — own data (ALL) — **FIX READY**

**Reference:**
- `ref_trades`, `ref_provinces`, `ref_units`: public SELECT (read-only lookup)
