-- 076: Support host-dashboard claim completion (post-login, no OTP).
--
-- Adds attribution columns so a host-completed claim can be told apart from a
-- public claim, and which host completed it. Also idempotently re-declares the
-- consent/accuracy columns: these exist in production (written by the public
-- /api/claim/initiate flow) but were never captured in a migration (schema
-- drift). IF NOT EXISTS makes this a no-op on prod and safe on a fresh DB.

ALTER TABLE claim_requests
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'public';

-- Consent / accuracy columns (capture prod drift; no-op where they already exist)
ALTER TABLE claim_requests
  ADD COLUMN IF NOT EXISTS everything_correct boolean,
  ADD COLUMN IF NOT EXISTS incorrect_fields   text[],
  ADD COLUMN IF NOT EXISTS additional_notes   text,
  ADD COLUMN IF NOT EXISTS social_media_url   text,
  ADD COLUMN IF NOT EXISTS website_url        text,
  ADD COLUMN IF NOT EXISTS photo_consent      text,
  ADD COLUMN IF NOT EXISTS consent_given      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp  timestamptz,
  ADD COLUMN IF NOT EXISTS consent_text       text;

CREATE INDEX IF NOT EXISTS idx_claim_requests_host_user
  ON claim_requests(host_user_id, status);
