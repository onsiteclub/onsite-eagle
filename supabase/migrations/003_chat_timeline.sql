-- ============================================================================
-- Migration: Chat Timeline + AI Reports System
-- ============================================================================
-- Author: Cerbero (Guardian of Supabase)
-- Date: 2026-02-01
-- Description: WhatsApp-style chat timeline for sites and lots
--              + Automatic AI report generation system
-- ============================================================================

-- =============================================================
-- PART 1: Messages Table
-- =============================================================

CREATE TABLE IF NOT EXISTS egl_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location: site-level (house_id NULL) or lot-level
  site_id uuid NOT NULL REFERENCES egl_sites(id) ON DELETE CASCADE,
  house_id uuid REFERENCES egl_houses(id) ON DELETE CASCADE,

  -- Sender info
  sender_type text NOT NULL CHECK (sender_type IN ('worker', 'supervisor', 'ai', 'system')),
  sender_id uuid REFERENCES core_profiles(id),
  sender_name text NOT NULL,
  sender_avatar_url text,

  -- Content
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',

  -- AI-specific fields
  is_ai_response boolean DEFAULT false,
  ai_question text,
  ai_context jsonb,
  ai_model text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  -- For replies/threads (future)
  reply_to_id uuid REFERENCES egl_messages(id),

  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================
-- PART 2: Messages Indexes
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_egl_messages_site
  ON egl_messages(site_id, created_at DESC)
  WHERE house_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_egl_messages_house
  ON egl_messages(house_id, created_at DESC)
  WHERE house_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_egl_messages_sender
  ON egl_messages(sender_id, created_at DESC)
  WHERE sender_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_egl_messages_ai
  ON egl_messages(site_id, created_at DESC)
  WHERE is_ai_response = true;

-- =============================================================
-- PART 3: Messages RLS
-- =============================================================

ALTER TABLE egl_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read messages" ON egl_messages;
CREATE POLICY "Read messages" ON egl_messages
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Insert messages" ON egl_messages;
CREATE POLICY "Insert messages" ON egl_messages
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Delete own messages" ON egl_messages;
CREATE POLICY "Delete own messages" ON egl_messages
  FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()
    AND sender_type NOT IN ('system', 'ai')
  );

-- =============================================================
-- PART 4: AI Reports Table
-- =============================================================

CREATE TABLE IF NOT EXISTS egl_ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  site_id uuid NOT NULL REFERENCES egl_sites(id) ON DELETE CASCADE,
  house_id uuid REFERENCES egl_houses(id) ON DELETE CASCADE,

  -- Report details
  report_type text NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom', 'alert')),
  title text NOT NULL,
  summary text NOT NULL,
  full_report text NOT NULL,

  -- Sections for structured report
  sections jsonb DEFAULT '[]',
  -- [{title, content, type: 'progress'|'delays'|'issues'|'recommendations'}]

  -- Analysis data
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- Metrics snapshot
  metrics jsonb NOT NULL DEFAULT '{}',
  -- {total_lots, completed, in_progress, delayed, progress_pct, ...}

  -- Highlights
  highlights jsonb DEFAULT '[]',
  -- [{type: 'positive'|'negative'|'neutral', text}]

  -- Recommendations
  recommendations jsonb DEFAULT '[]',
  -- [{priority: 'high'|'medium'|'low', action, reason}]

  -- AI metadata
  ai_model text,
  ai_confidence decimal(3,2),
  generation_time_ms int,

  -- Status
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'reviewed', 'archived', 'sent')),
  reviewed_by uuid REFERENCES core_profiles(id),
  reviewed_at timestamptz,

  -- Delivery
  sent_to jsonb DEFAULT '[]', -- [{email, sent_at}]

  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================
-- PART 5: Reports Indexes
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_egl_ai_reports_site
  ON egl_ai_reports(site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_egl_ai_reports_house
  ON egl_ai_reports(house_id, created_at DESC)
  WHERE house_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_egl_ai_reports_type
  ON egl_ai_reports(report_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_egl_ai_reports_status
  ON egl_ai_reports(status, created_at DESC);

-- =============================================================
-- PART 6: Reports RLS
-- =============================================================

ALTER TABLE egl_ai_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read reports" ON egl_ai_reports;
CREATE POLICY "Read reports" ON egl_ai_reports
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Insert reports" ON egl_ai_reports;
CREATE POLICY "Insert reports" ON egl_ai_reports
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Update reports" ON egl_ai_reports;
CREATE POLICY "Update reports" ON egl_ai_reports
  FOR UPDATE TO authenticated
  USING (true);

-- =============================================================
-- PART 7: Report Context Function
-- =============================================================

CREATE OR REPLACE FUNCTION get_report_context(
  p_site_id uuid,
  p_house_id uuid DEFAULT NULL,
  p_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_site jsonb;
  v_house jsonb;
  v_houses jsonb;
  v_messages jsonb;
  v_stats jsonb;
  v_timeline jsonb;
  v_photos jsonb;
BEGIN
  -- Get site info
  SELECT jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'city', s.city,
    'total_lots', s.total_lots,
    'completed_lots', s.completed_lots,
    'start_date', s.start_date,
    'expected_end_date', s.expected_end_date
  ) INTO v_site
  FROM egl_sites s
  WHERE s.id = p_site_id;

  -- Get all houses with status
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', h.id,
      'lot_number', h.lot_number,
      'status', h.status,
      'current_phase', h.current_phase,
      'progress_percentage', h.progress_percentage
    ) ORDER BY h.lot_number
  ) INTO v_houses
  FROM egl_houses h
  WHERE h.site_id = p_site_id;

  -- Get house info if specific lot
  IF p_house_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', h.id,
      'lot_number', h.lot_number,
      'status', h.status,
      'current_phase', h.current_phase,
      'progress_percentage', h.progress_percentage,
      'address', h.address
    ) INTO v_house
    FROM egl_houses h
    WHERE h.id = p_house_id;
  END IF;

  -- Get recent messages from period
  SELECT jsonb_agg(
    jsonb_build_object(
      'sender_type', m.sender_type,
      'sender_name', m.sender_name,
      'content', m.content,
      'created_at', m.created_at
    ) ORDER BY m.created_at DESC
  ) INTO v_messages
  FROM egl_messages m
  WHERE m.site_id = p_site_id
    AND (p_house_id IS NULL OR m.house_id = p_house_id)
    AND m.created_at >= now() - (p_days || ' days')::interval
  LIMIT 50;

  -- Calculate current stats
  SELECT jsonb_build_object(
    'total_houses', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'delayed', COUNT(*) FILTER (WHERE status = 'delayed'),
    'not_started', COUNT(*) FILTER (WHERE status = 'not_started'),
    'on_hold', COUNT(*) FILTER (WHERE status = 'on_hold'),
    'avg_progress', ROUND(AVG(progress_percentage)::numeric, 1)
  ) INTO v_stats
  FROM egl_houses
  WHERE site_id = p_site_id;

  -- Get timeline events from period
  SELECT jsonb_agg(
    jsonb_build_object(
      'event_type', t.event_type,
      'title', t.title,
      'description', t.description,
      'house_id', t.house_id,
      'created_at', t.created_at
    ) ORDER BY t.created_at DESC
  ) INTO v_timeline
  FROM egl_timeline_events t
  JOIN egl_houses h ON t.house_id = h.id
  WHERE h.site_id = p_site_id
    AND (p_house_id IS NULL OR t.house_id = p_house_id)
    AND t.created_at >= now() - (p_days || ' days')::interval
  LIMIT 100;

  -- Get photo validations from period
  SELECT jsonb_agg(
    jsonb_build_object(
      'house_id', p.house_id,
      'phase_id', p.phase_id,
      'ai_validation_status', p.ai_validation_status,
      'created_at', p.created_at
    ) ORDER BY p.created_at DESC
  ) INTO v_photos
  FROM egl_phase_photos p
  JOIN egl_houses h ON p.house_id = h.id
  WHERE h.site_id = p_site_id
    AND (p_house_id IS NULL OR p.house_id = p_house_id)
    AND p.created_at >= now() - (p_days || ' days')::interval
  LIMIT 50;

  -- Build result
  v_result := jsonb_build_object(
    'site', v_site,
    'house', v_house,
    'houses', COALESCE(v_houses, '[]'::jsonb),
    'messages', COALESCE(v_messages, '[]'::jsonb),
    'stats', v_stats,
    'timeline', COALESCE(v_timeline, '[]'::jsonb),
    'photos', COALESCE(v_photos, '[]'::jsonb),
    'period_days', p_days,
    'generated_at', now()
  );

  RETURN v_result;
END;
$$;

-- =============================================================
-- PART 8: Comments
-- =============================================================

COMMENT ON TABLE egl_messages IS 'WhatsApp-style chat timeline for sites and lots';
COMMENT ON COLUMN egl_messages.house_id IS 'NULL for site-level messages, set for lot-level';
COMMENT ON COLUMN egl_messages.sender_type IS 'worker, supervisor, ai, or system';
COMMENT ON COLUMN egl_messages.is_ai_response IS 'True if this was an AI response that user confirmed to save';
COMMENT ON COLUMN egl_messages.ai_question IS 'The question that prompted this AI response';

COMMENT ON TABLE egl_ai_reports IS 'AI-generated reports for sites and lots';
COMMENT ON COLUMN egl_ai_reports.report_type IS 'daily, weekly, monthly, custom, or alert';
COMMENT ON COLUMN egl_ai_reports.metrics IS 'Snapshot of metrics at report generation time';
COMMENT ON COLUMN egl_ai_reports.highlights IS 'Key findings from the analysis';
COMMENT ON COLUMN egl_ai_reports.recommendations IS 'AI suggestions for next steps';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
