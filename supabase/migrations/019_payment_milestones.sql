-- =====================================================================
-- Migration 019: Payment Milestone Fields on egl_schedule_phases
--
-- Adds payment tracking columns so the Monitor can track work completion
-- milestones and export Work Completion Sheets.
--
-- The system NEVER stores monetary values — only milestones.
-- Foreman fills dollar amounts manually in the exported spreadsheet.
--
-- Two axes of status per phase:
--   AXIS 1 (work):    pending → in_progress → completed → approved
--   AXIS 2 (payment): not_due → due → approved_for_payment → exported
-- =====================================================================

BEGIN;

-- Add payment tracking columns to egl_schedule_phases
-- (using DO block to be idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'egl_schedule_phases' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE egl_schedule_phases
      ADD COLUMN payment_status varchar DEFAULT 'not_due',
      ADD COLUMN payment_approved_at timestamptz,
      ADD COLUMN payment_approved_by uuid REFERENCES core_profiles(id),
      ADD COLUMN payment_exported_at timestamptz,
      ADD COLUMN payment_notes text;
  END IF;
END $$;

-- Index for filtering by payment status
CREATE INDEX IF NOT EXISTS idx_schedule_phases_payment_status
  ON egl_schedule_phases(payment_status)
  WHERE payment_status != 'not_due';

-- Add site_id to egl_schedules if missing (needed for PaymentsTab queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'egl_schedules' AND column_name = 'site_id'
  ) THEN
    ALTER TABLE egl_schedules
      ADD COLUMN site_id uuid REFERENCES egl_sites(id);

    -- Populate site_id from house → site relationship
    UPDATE egl_schedules s
    SET site_id = h.site_id
    FROM egl_houses h
    WHERE s.house_id = h.id
    AND s.site_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_schedules_site_id
  ON egl_schedules(site_id)
  WHERE site_id IS NOT NULL;

COMMIT;

-- Verification:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'egl_schedule_phases'
-- AND column_name LIKE 'payment_%';
