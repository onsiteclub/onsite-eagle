-- operator_2 SMS ingest: relax constraints so anonymous SMS workers can land
-- requests without a pre-existing core_profiles row, lot, or phase context.
--
-- Test mode. Real integrations (worker registration, lot-matching, phase
-- attribution) can fill in these fields later without schema changes.

-- 1. frm_site_workers.worker_id -> previously FK to core_profiles + NOT NULL.
--    SMS workers are phone-identified, not account-identified. Let it be NULL
--    and drop the FK so we can create worker rows on first inbound message.
ALTER TABLE frm_site_workers
  DROP CONSTRAINT IF EXISTS frm_site_workers_worker_id_fkey;
ALTER TABLE frm_site_workers
  ALTER COLUMN worker_id DROP NOT NULL;

-- 2. frm_material_requests.requested_by -> FK to core_profiles + NOT NULL.
--    Same reasoning: the requester over SMS has no auth account.
ALTER TABLE frm_material_requests
  DROP CONSTRAINT IF EXISTS frm_material_requests_requested_by_fkey;
ALTER TABLE frm_material_requests
  ALTER COLUMN requested_by DROP NOT NULL;

-- 3. frm_material_requests.lot_id -> NOT NULL + FK to frm_lots.
--    AI may not resolve a lot from the message. Keep the FK (so only real
--    lots can be linked), but allow NULL for unresolved/ambiguous requests.
ALTER TABLE frm_material_requests
  ALTER COLUMN lot_id DROP NOT NULL;

-- 4. frm_material_requests.phase_id -> NOT NULL + FK to frm_phases.
--    Phase rarely extractable from an SMS; allow NULL until operator sets it.
ALTER TABLE frm_material_requests
  ALTER COLUMN phase_id DROP NOT NULL;
