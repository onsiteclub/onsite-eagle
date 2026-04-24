-- Preserve the lot string the AI extracted, even when no matching frm_lots
-- row exists (e.g. fresh sites where lots haven't been registered yet).
-- The UI shows this as the card title — the most valuable information in
-- a material request.
ALTER TABLE frm_material_requests
  ADD COLUMN IF NOT EXISTS lot_text_hint TEXT;

COMMENT ON COLUMN frm_material_requests.lot_text_hint IS
  'Raw lot identifier as extracted by AI from the SMS (e.g. "15", "22A", "70-C"). May or may not match a frm_lots row.';
