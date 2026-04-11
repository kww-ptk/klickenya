-- 052_reservations_bookable_hours.sql
-- V1.5 bookable hours: one open time + one close time per menu, applied every day of the week.
-- Per-day-of-week variation is deferred to V2 (reservation_slots table, migration 049).

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS reservations_open_time  time NOT NULL DEFAULT '12:00',  -- ACTIVE V1.5
  ADD COLUMN IF NOT EXISTS reservations_close_time time NOT NULL DEFAULT '21:00';  -- ACTIVE V1.5

-- TODO V2: Per-day-of-week variation moves to reservation_slots table in V2.
