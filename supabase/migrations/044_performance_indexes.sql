-- 044_performance_indexes.sql
-- Three indexes identified as missing by a full codebase audit against
-- all query patterns in API routes, server components, and dashboard pages.
-- Note: CONCURRENTLY is omitted because Supabase SQL Editor runs inside a
-- transaction block. These indexes build quickly on typical table sizes.

-- ─────────────────────────────────────────────────────────────────────────────
-- menu_sections(menu_id)
--
-- Serves every public menu page load (/m/[slug]) and menu builder load
-- (/dashboard/menu/[id]). PostgREST translates nested .select("menu_sections()")
-- into SELECT … FROM menu_sections WHERE menu_id = ?  — a full table scan
-- without this index. Also speeds up RLS policy evaluation: both
-- menu_sections_owner_all and menu_sections_public_read policies join on
-- menu_sections.menu_id = menus.id, evaluated for every row access.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_menu_sections_menu_id
  ON menu_sections(menu_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- bookings(room_id, check_in_date, check_out_date)
--
-- Serves the is_room_available() plpgsql function (migration 031), called on
-- every booking inquiry and every property calendar render:
--
--   SELECT 1 FROM public.bookings
--   WHERE room_id = p_room_id
--     AND status NOT IN ('cancelled')
--     AND check_in_date < p_check_out
--     AND check_out_date > p_check_in
--
-- The existing idx_bookings_room_id narrows to all bookings for the room and
-- then scans in memory for the date range. This composite lets Postgres do a
-- range scan within the room's rows directly, which matters as booking history
-- grows. blocked_dates already has the equivalent composite (migration 031).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates
  ON public.bookings(room_id, check_in_date, check_out_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- event_attendees(event_sanity_id, status)
--
-- Serves confirmed attendee count queries on the host dashboard:
--
--   .from("event_attendees")
--   .select("event_sanity_id")
--   .in("event_sanity_id", eventIds)
--   .eq("status", "confirmed")
--
-- The existing idx_event_attendees_event covers the event_sanity_id filter,
-- but status is post-filtered in memory. This composite allows Postgres to
-- skip non-confirmed rows at the index level and supports index-only scans
-- for the count, avoiding heap access entirely.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_status
  ON event_attendees(event_sanity_id, status);
