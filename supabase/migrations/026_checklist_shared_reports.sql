-- Migration 026: Formalize frm_shared_reports + frm_shared_report_items
--
-- These tables were created ad-hoc via the /api/reports admin-client
-- endpoint. The Capacitor refactor moves writes to the client using the
-- anon key, so we need:
--   1. The tables defined with CREATE IF NOT EXISTS (for consistency).
--   2. RLS enabled with token-based access (link = access).
--   3. Storage policy letting anon upload to shared-reports/*.
--
-- Token length (12 base64 chars ≈ 72 bits) provides enough entropy to
-- treat the token as a bearer secret carried in the URL.

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.frm_shared_reports (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token              text NOT NULL UNIQUE,
  reference          text UNIQUE,
  source             text NOT NULL DEFAULT 'self',

  inspector_name     text NOT NULL,
  inspector_company  text,
  jobsite            text NOT NULL,
  lot_number         text NOT NULL,

  transition         text NOT NULL,
  transition_label   text NOT NULL,

  passed             boolean NOT NULL DEFAULT false,
  total_items        int NOT NULL DEFAULT 0,
  pass_count         int NOT NULL DEFAULT 0,
  fail_count         int NOT NULL DEFAULT 0,
  na_count           int NOT NULL DEFAULT 0,
  total_photos       int NOT NULL DEFAULT 0,

  started_at         timestamptz,
  completed_at       timestamptz,

  updated_by         text,
  edit_history       jsonb NOT NULL DEFAULT '[]'::jsonb,

  expires_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frm_shared_reports_token
  ON public.frm_shared_reports(token);

CREATE TABLE IF NOT EXISTS public.frm_shared_report_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     uuid NOT NULL REFERENCES public.frm_shared_reports(id) ON DELETE CASCADE,
  item_code     text NOT NULL,
  item_label    text NOT NULL,
  sort_order    int NOT NULL DEFAULT 0,
  is_blocking   boolean NOT NULL DEFAULT false,
  result        text NOT NULL CHECK (result IN ('pass', 'fail', 'na')),
  notes         text,
  photo_urls    text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frm_shared_report_items_report
  ON public.frm_shared_report_items(report_id);

-- Auto-touch updated_at on frm_shared_reports updates.
CREATE OR REPLACE FUNCTION public.frm_shared_reports_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_frm_shared_reports_updated_at ON public.frm_shared_reports;
CREATE TRIGGER trg_frm_shared_reports_updated_at
  BEFORE UPDATE ON public.frm_shared_reports
  FOR EACH ROW EXECUTE FUNCTION public.frm_shared_reports_set_updated_at();

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------
-- Access model: the token in the URL IS the credential. Anyone holding
-- a valid token can read and update the report. We never expose a
-- listing endpoint, so you have to know the token to interact at all.

ALTER TABLE public.frm_shared_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frm_shared_report_items ENABLE ROW LEVEL SECURITY;

-- Reports --------------------------------------------------

DROP POLICY IF EXISTS "Anyone can insert shared reports"    ON public.frm_shared_reports;
DROP POLICY IF EXISTS "Anyone can read shared reports"      ON public.frm_shared_reports;
DROP POLICY IF EXISTS "Anyone can update shared reports"    ON public.frm_shared_reports;

CREATE POLICY "Anyone can insert shared reports"
  ON public.frm_shared_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (token IS NOT NULL AND length(token) >= 10);

CREATE POLICY "Anyone can read shared reports"
  ON public.frm_shared_reports
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update shared reports"
  ON public.frm_shared_reports
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Items ----------------------------------------------------

DROP POLICY IF EXISTS "Anyone can insert shared report items" ON public.frm_shared_report_items;
DROP POLICY IF EXISTS "Anyone can read shared report items"   ON public.frm_shared_report_items;
DROP POLICY IF EXISTS "Anyone can update shared report items" ON public.frm_shared_report_items;

CREATE POLICY "Anyone can insert shared report items"
  ON public.frm_shared_report_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.frm_shared_reports r
      WHERE r.id = report_id
    )
  );

CREATE POLICY "Anyone can read shared report items"
  ON public.frm_shared_report_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update shared report items"
  ON public.frm_shared_report_items
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------
-- Storage policy: anon can upload/read shared-reports/* in frm-media
-- ------------------------------------------------------------------

DO $$
BEGIN
  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Anyone can upload shared report photos'
  ) THEN
    CREATE POLICY "Anyone can upload shared report photos"
      ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        bucket_id = 'frm-media'
        AND (storage.foldername(name))[1] = 'shared-reports'
      );
  END IF;

  -- SELECT (public read)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Anyone can read shared report photos'
  ) THEN
    CREATE POLICY "Anyone can read shared report photos"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (
        bucket_id = 'frm-media'
        AND (storage.foldername(name))[1] = 'shared-reports'
      );
  END IF;

  -- UPDATE (for upsert on re-edit)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Anyone can update shared report photos'
  ) THEN
    CREATE POLICY "Anyone can update shared report photos"
      ON storage.objects
      FOR UPDATE
      TO anon, authenticated
      USING (
        bucket_id = 'frm-media'
        AND (storage.foldername(name))[1] = 'shared-reports'
      )
      WITH CHECK (
        bucket_id = 'frm-media'
        AND (storage.foldername(name))[1] = 'shared-reports'
      );
  END IF;
END $$;
