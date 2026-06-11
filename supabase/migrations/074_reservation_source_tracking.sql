-- 074_reservation_source_tracking.sql
-- Adds source-tracking fields so the embed reservation iframe (and any future
-- channel) can be attributed back to the page that produced the booking.
--
-- The existing `reservations.source` is already a Postgres ENUM
-- (`reservation_source`, values: qr_menu | listing | direct | phone) populated
-- since migration 049. Rather than rebuilding it, we extend the enum with
-- 'embed' for iframe bookings, then add two free-text columns capturing the
-- parent page hostname and an optional owner-set campaign label.

-- ─── 1. Extend the existing enum ─────────────────────────────────────────────
-- ADD VALUE IF NOT EXISTS keeps the migration idempotent across reruns.
ALTER TYPE reservation_source ADD VALUE IF NOT EXISTS 'embed';

-- ─── 2. Add free-text tracking columns ───────────────────────────────────────
-- source_origin: parsed from the inbound Referer header at the embed route.
--   Hostname only (no paths / query strings) per privacy discipline.
-- source_ref:    owner-set campaign label, passed via ?ref=... on the embed
--   URL (e.g. ?ref=instagram-bio). Capped at 64 chars in the API.
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS source_origin text,
  ADD COLUMN IF NOT EXISTS source_ref    text;

-- ─── 3. Index for the "Where bookings come from" analytics panel ─────────────
-- The 30-day count aggregates filter by menu_id + source. The existing
-- idx_reservations_menu_date doesn't cover source, so add a dedicated one.
CREATE INDEX IF NOT EXISTS idx_reservations_menu_source
  ON reservations (menu_id, source);
