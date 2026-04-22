-- Operator_2 support tables
-- - frm_operator_state:   single row per operator (online/offline + reason)
-- - frm_alerts:           immutable log of supervisor alerts
-- - frm_operator_numbers: multi-tenant SMS number provisioning (Phase 2)

-- ============================================================================
-- frm_operator_state
-- ============================================================================
CREATE TABLE IF NOT EXISTS frm_operator_state (
  operator_id  UUID PRIMARY KEY REFERENCES auth.users(id),
  site_id      UUID REFERENCES frm_jobsites(id),
  status       TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online','offline')),
  reason       TEXT CHECK (reason IS NULL OR reason IN ('broken','low_fuel','maintenance','shift_end')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE frm_operator_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operator_own_state" ON frm_operator_state
  FOR ALL TO authenticated
  USING (operator_id = auth.uid())
  WITH CHECK (operator_id = auth.uid());

CREATE POLICY "service_role_all_state" ON frm_operator_state
  FOR SELECT TO service_role
  USING (true);

-- ============================================================================
-- frm_alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS frm_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   UUID REFERENCES auth.users(id),
  site_id       UUID REFERENCES frm_jobsites(id),
  type          TEXT NOT NULL CHECK (type IN ('low_fuel','broken','maintenance','other')),
  message       TEXT,
  sent_to_supervisor_at  TIMESTAMPTZ,
  acknowledged_at        TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS frm_alerts_operator_date ON frm_alerts(operator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS frm_alerts_site_date ON frm_alerts(site_id, created_at DESC);

ALTER TABLE frm_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operator_insert_alerts" ON frm_alerts
  FOR INSERT TO authenticated
  WITH CHECK (operator_id = auth.uid());

CREATE POLICY "operator_read_alerts" ON frm_alerts
  FOR SELECT TO authenticated
  USING (operator_id = auth.uid());

CREATE POLICY "service_role_all_alerts" ON frm_alerts
  FOR ALL TO service_role
  USING (true);

-- ============================================================================
-- frm_operator_numbers  (multi-tenant SMS number provisioning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS frm_operator_numbers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id         UUID REFERENCES frm_jobsites(id),
  phone_e164      TEXT UNIQUE NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'twilio' CHECK (provider IN ('twilio','telnyx','bandwidth')),
  provider_sid    TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','suspended')),
  monthly_cost    NUMERIC(10,4),
  provisioned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at     TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS frm_operator_numbers_operator ON frm_operator_numbers(operator_id);
CREATE INDEX IF NOT EXISTS frm_operator_numbers_phone ON frm_operator_numbers(phone_e164);

ALTER TABLE frm_operator_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operator_own_numbers_read" ON frm_operator_numbers
  FOR SELECT TO authenticated
  USING (operator_id = auth.uid());

CREATE POLICY "service_role_all_numbers" ON frm_operator_numbers
  FOR ALL TO service_role
  USING (true);
