-- 049_reservations.sql
-- Table reservations V1: menus flags, areas, reservation_slots (dormant), reservations
-- Convention: every dormant column carries -- DORMANT V2 or -- DORMANT V3 comment (grep-able).

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE reservation_status AS ENUM (
  'pending',
  'approved',
  'declined',
  'checked_in',
  'completed',
  'no_show',
  'cancelled'
);

CREATE TYPE reservation_source AS ENUM (
  'qr_menu',
  'listing',
  'direct',
  'phone'
);

-- ─── ALTER TABLE menus ────────────────────────────────────────────────────────
-- All columns NOT NULL with sensible defaults (booleans/ints can be NOT NULL).

ALTER TABLE menus
  -- V1 active columns
  ADD COLUMN IF NOT EXISTS reservations_enabled        boolean NOT NULL DEFAULT false,           -- ACTIVE V1
  ADD COLUMN IF NOT EXISTS default_reservation_duration int     NOT NULL DEFAULT 90,             -- ACTIVE V1 (minutes)
  ADD COLUMN IF NOT EXISTS reservations_lead_time_hours int     NOT NULL DEFAULT 2,              -- ACTIVE V1
  ADD COLUMN IF NOT EXISTS reservations_max_party_size  int     NOT NULL DEFAULT 12,             -- ACTIVE V1
  ADD COLUMN IF NOT EXISTS reservations_max_advance_days int    NOT NULL DEFAULT 30,             -- ACTIVE V1
  -- Dormant columns (nullable, no default enforcement needed yet)
  ADD COLUMN IF NOT EXISTS reservations_auto_approve   boolean          DEFAULT false,           -- DORMANT V2
  ADD COLUMN IF NOT EXISTS reservations_require_deposit boolean         DEFAULT false,           -- DORMANT V3
  ADD COLUMN IF NOT EXISTS reservations_deposit_amount_kes int;                                  -- DORMANT V3

-- ─── TABLE: restaurant_areas ─────────────────────────────────────────────────
-- Logical seating areas (Indoor, Terrace, Bar, etc.)
-- area_id is attached to reservations; tables will reference areas in V2.

CREATE TABLE IF NOT EXISTS restaurant_areas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id        uuid REFERENCES menus(id) ON DELETE CASCADE NOT NULL,   -- ACTIVE V1
  name           text NOT NULL,                                           -- ACTIVE V1
  capacity_total int  NOT NULL DEFAULT 20,                                -- ACTIVE V1
  display_order  int  NOT NULL DEFAULT 0,                                 -- ACTIVE V1
  color_hex      text,                                                    -- ACTIVE V1 (optional UI accent)
  is_active      boolean NOT NULL DEFAULT true,                           -- ACTIVE V1
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_areas_menu ON restaurant_areas(menu_id);

-- ─── ALTER TABLE restaurant_tables ───────────────────────────────────────────

ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES restaurant_areas(id) ON DELETE SET NULL;     -- DORMANT V2

-- ─── TABLE: reservation_slots ────────────────────────────────────────────────
-- DORMANT V2 — entire table is dormant. Created now so V2 can alter without data loss.

CREATE TABLE IF NOT EXISTS reservation_slots (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id              uuid REFERENCES menus(id) ON DELETE CASCADE NOT NULL,           -- DORMANT V2
  area_id              uuid REFERENCES restaurant_areas(id) ON DELETE CASCADE,         -- DORMANT V2
  day_of_week          int  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),              -- DORMANT V2 (0=Sunday)
  start_time           time NOT NULL,                                                  -- DORMANT V2
  end_time             time NOT NULL,                                                  -- DORMANT V2
  max_covers           int  NOT NULL DEFAULT 40,                                       -- DORMANT V2
  slot_duration_minutes int NOT NULL DEFAULT 90,                                       -- DORMANT V2
  is_active            boolean NOT NULL DEFAULT true                                   -- DORMANT V2
);

-- ─── TABLE: reservations ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reservations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id        uuid REFERENCES menus(id) ON DELETE CASCADE NOT NULL,

  -- ACTIVE V1 guest & booking fields
  guest_name     text        NOT NULL,                                                 -- ACTIVE V1
  guest_phone    text        NOT NULL,                                                 -- ACTIVE V1
  party_size     int         NOT NULL CHECK (party_size > 0),                         -- ACTIVE V1
  reserved_for   timestamptz NOT NULL,                                                 -- ACTIVE V1
  duration_minutes int       NOT NULL DEFAULT 90,                                     -- ACTIVE V1
  area_id        uuid        REFERENCES restaurant_areas(id) ON DELETE SET NULL,       -- ACTIVE V1 (null = no preference)
  status         reservation_status NOT NULL DEFAULT 'pending',                        -- ACTIVE V1
  guest_message  text,                                                                 -- ACTIVE V1
  owner_note     text,                                                                 -- ACTIVE V1
  decline_reason text,                                                                 -- ACTIVE V1
  source         reservation_source NOT NULL DEFAULT 'qr_menu',                        -- ACTIVE V1
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- DORMANT V2 fields
  table_id       uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,             -- DORMANT V2
  session_id     uuid,                                                                  -- DORMANT V2 (table_sessions ref)
  slot_id        uuid REFERENCES reservation_slots(id) ON DELETE SET NULL,             -- DORMANT V2
  approved_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,                   -- DORMANT V2
  approved_at    timestamptz,                                                           -- DORMANT V2
  checked_in_at  timestamptz,                                                           -- DORMANT V2
  completed_at   timestamptz,                                                           -- DORMANT V2

  -- DORMANT V3 fields
  deposit_amount_kes int,                                                               -- DORMANT V3
  deposit_mpesa_ref  text,                                                              -- DORMANT V3
  deposit_paid_at    timestamptz                                                        -- DORMANT V3
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_reservations_menu_date
  ON reservations(menu_id, reserved_for);

CREATE INDEX IF NOT EXISTS idx_reservations_pending
  ON reservations(menu_id, status)
  WHERE status IN ('pending', 'approved');

-- ─── updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_reservations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_reservations_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE restaurant_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- restaurant_areas: public can read active areas for published menus; owners can manage
CREATE POLICY "areas_public_read" ON restaurant_areas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = restaurant_areas.menu_id
        AND menus.is_published = true
    )
  );

CREATE POLICY "areas_owner_all" ON restaurant_areas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = restaurant_areas.menu_id
        AND menus.business_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = restaurant_areas.menu_id
        AND menus.business_id = auth.uid()
    )
  );

-- reservations: public can INSERT (guest booking); owners can SELECT/UPDATE their rows
CREATE POLICY "reservations_public_insert" ON reservations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "reservations_owner_select" ON reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservations.menu_id
        AND menus.business_id = auth.uid()
    )
  );

CREATE POLICY "reservations_owner_update" ON reservations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservations.menu_id
        AND menus.business_id = auth.uid()
    )
  );

-- reservation_slots dormant — owner-only for now
CREATE POLICY "slots_owner_all" ON reservation_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM menus
      WHERE menus.id = reservation_slots.menu_id
        AND menus.business_id = auth.uid()
    )
  );
