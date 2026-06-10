-- 073_partner_linkage.sql
-- White-label foundation (Plan 1).
-- Links a host to a white-label partner. NULL = Klickenya house brand
-- (all existing hosts), so this is behaviourally inert for current data.
--
-- partner_id stores the Sanity `partner` document slug (stable, human-readable)
-- rather than the Sanity _id, so it survives content re-imports and is easy to
-- set during onboarding. A host belongs to at most one partner.
--
-- Idempotent via IF NOT EXISTS — safe to re-run.

ALTER TABLE host_profiles
  ADD COLUMN IF NOT EXISTS partner_id text;

-- Fast lookup of all hosts for a given partner (onboarding/admin).
CREATE INDEX IF NOT EXISTS idx_host_profiles_partner_id
  ON host_profiles (partner_id);
