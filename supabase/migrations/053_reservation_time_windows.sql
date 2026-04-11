-- 053_reservation_time_windows.sql
-- Replace the two V1.5 time columns on menus (added in 052) with a proper
-- reservation_time_windows table supporting multiple windows per menu (e.g. Lunch + Dinner).

-- ── Create table ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reservation_time_windows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id       uuid REFERENCES menus(id) ON DELETE CASCADE NOT NULL,
  open_time     time NOT NULL,
  close_time    time NOT NULL,
  label         text,                              -- optional "Lunch", "Dinner", etc.
  display_order int  NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_time_windows_menu
  ON reservation_time_windows(menu_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE reservation_time_windows ENABLE ROW LEVEL SECURITY;

-- Public can read active windows for published menus (needed for guest booking form)
CREATE POLICY "time_windows_public_read" ON reservation_time_windows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservation_time_windows.menu_id
        AND menus.is_published = true
    )
  );

-- Owner can manage their own windows
CREATE POLICY "time_windows_owner_all" ON reservation_time_windows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservation_time_windows.menu_id
        AND menus.business_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservation_time_windows.menu_id
        AND menus.business_id = auth.uid()
    )
  );

-- ── Migrate existing data from menus columns ───────────────────────────────────
-- For any menu that has reservations_enabled and non-default open/close times,
-- insert one window. Default (12:00/21:00) menus get no window here —
-- they will get seeded on first enable via the settings route.

INSERT INTO reservation_time_windows (menu_id, open_time, close_time, display_order)
SELECT id, reservations_open_time, reservations_close_time, 0
FROM menus
WHERE reservations_enabled = true
  AND reservations_open_time IS NOT NULL
  AND reservations_close_time IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Drop old columns ───────────────────────────────────────────────────────────
-- Safe to drop — data migrated above.

ALTER TABLE menus
  DROP COLUMN IF EXISTS reservations_open_time,
  DROP COLUMN IF EXISTS reservations_close_time;

-- TODO V2: Per-day-of-week variation and capacity-per-slot → reservation_slots table (migration 049).
