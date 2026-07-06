-- 077_general_contacts_source.sql
-- Tag general contact messages with the partner source (matches
-- host_profiles.partner_id) so a partner host can see only their own messages
-- in the dashboard, and the admin can filter contacts by originating site.
-- newsletter_subscribers already has a `source` column (migration added earlier).
-- Idempotent via IF NOT EXISTS — safe to re-run.

ALTER TABLE general_contacts
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS idx_general_contacts_source
  ON general_contacts (source);
