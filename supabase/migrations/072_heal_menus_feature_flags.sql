-- 072_heal_menus_feature_flags.sql
-- Heals environments where the menus table is missing one or more of the
-- four "feature flag" columns that the listing dashboard SELECTs.
--
-- Symptom: the dashboard query
--   SELECT id, table_ordering, reservations_enabled, ordering_enabled,
--          takeaway_enabled, delivery_enabled, stock_enabled
--   FROM menus WHERE listing_slug = ... AND business_id = ...
-- errored on the FIRST missing column (e.g. "column 'ordering_enabled'
-- does not exist") and bubbled up as a null result. The page silently
-- rendered "Your listing is live! You haven't enabled any add-ons yet"
-- and an empty Quick Access section — even when features WERE enabled.
--
-- Root cause: migration 028_menu_system.sql added these columns inline
-- to its CREATE TABLE menus statement, but environments where the menus
-- table predated 028 (or where 028 was applied before the columns were
-- added) ended up without them. ordering_enabled was the most common
-- casualty; takeaway/delivery/stock were defensively included so a
-- second drift can't bite us again.
--
-- All four columns default to false, matching the documented V0
-- dormant-feature state. Existing rows are unaffected behaviourally.
-- Idempotent via IF NOT EXISTS — safe to re-run.

ALTER TABLE menus ADD COLUMN IF NOT EXISTS ordering_enabled boolean DEFAULT false;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS takeaway_enabled boolean DEFAULT false;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS delivery_enabled boolean DEFAULT false;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS stock_enabled    boolean DEFAULT false;
