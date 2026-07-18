-- Event door codes: let event staff validate tickets at the gate without the
-- host's own login. A host generates a code for an event; staff redeem it for
-- a signed door-session cookie scoped to that event. Codes are stored hashed.
CREATE TABLE event_door_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sanity_id text NOT NULL,
  code_hash text NOT NULL,              -- sha256 hex of the uppercase code
  label text,                           -- optional, e.g. "Main gate"
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX idx_event_door_codes_event ON event_door_codes (event_sanity_id) WHERE revoked_at IS NULL;
-- Only one active code per hash globally (codes are random; lets redeem look up by code alone).
CREATE UNIQUE INDEX idx_event_door_codes_hash ON event_door_codes (code_hash) WHERE revoked_at IS NULL;
ALTER TABLE event_door_codes ENABLE ROW LEVEL SECURITY;  -- deny-all: adminClient only
