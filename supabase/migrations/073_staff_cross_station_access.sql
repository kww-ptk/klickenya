-- 073_staff_cross_station_access.sql
-- Adds a per-staff opt-in so a kitchen or bar PIN can also advance the
-- other station's items. Default false — preserves existing behaviour
-- (kitchen staff only kitchen items, bar staff only bar items). Owner
-- toggles on a per-staff basis from the staff add/edit form.
--
-- Idempotent via IF NOT EXISTS.

ALTER TABLE restaurant_staff
  ADD COLUMN IF NOT EXISTS can_access_all_stations boolean NOT NULL DEFAULT false;
