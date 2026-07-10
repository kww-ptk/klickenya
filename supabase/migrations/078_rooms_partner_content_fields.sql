-- 078_rooms_partner_content_fields.sql
-- Adds villa-content fields needed so a partner site (Claris African Experience)
-- can hold its full public-page content in Klickenya instead of its own database.
--
-- The Claris public villa pages use a short + long description split, an FAQ
-- accordion, and a bed count. Klickenya's `rooms` table only had a single
-- `description` (maps to the long form) and `bed_type` (not a count). These
-- three columns close that gap so the static-site generator can source villas
-- from Klickenya without losing content.
--
-- All nullable / defaulted — behaviourally inert for existing rooms.
-- Idempotent via IF NOT EXISTS.

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS bed_count integer,
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb;
