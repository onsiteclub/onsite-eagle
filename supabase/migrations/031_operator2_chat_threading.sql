-- Enable chat threading per material request + easy outbound SMS routing.
--
-- The operator_2 app renders each material request as a conversation thread:
-- worker bubbles + machinist bubbles + delivery notification. Threading is
-- achieved by linking every frm_messages row to a request_id.
--
-- Denormalising worker_phone on frm_material_requests avoids a 2-hop lookup
-- every time the machinist hits Reply.

ALTER TABLE frm_messages
  ADD COLUMN IF NOT EXISTS request_id UUID
    REFERENCES frm_material_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_frm_messages_request_id
  ON frm_messages(request_id) WHERE request_id IS NOT NULL;

ALTER TABLE frm_material_requests
  ADD COLUMN IF NOT EXISTS worker_phone TEXT;

COMMENT ON COLUMN frm_material_requests.worker_phone IS
  'E.164 phone of the worker who sent the SMS. Used by send-to-worker to route machinist replies.';

COMMENT ON COLUMN frm_messages.request_id IS
  'Link to the material request this message belongs to. Enables per-request chat threads in the UI.';
