-- 054_staff_and_sessions.sql
-- Activates the POS V2 foundation:
--   1. New restaurant_staff table (PIN-authed waiters/managers/cashiers)
--   2. Activates table_sessions (created dormant in 045) with status, totals,
--      payment, lifecycle timestamps, opened_by FK
--   3. Adds waiter_id to orders (table_session_id already exists from 045)
--   4. Adds default_service_charge_pct on menus
-- Every column added below is annotated -- ACTIVE V2.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. restaurant_staff
-- ─────────────────────────────────────────────────────────────────────────────
-- Lightweight PIN-based identities. NOT Supabase Auth users — staff log into
-- the POS terminal at /pos/[slug] with a 4-digit PIN unique within the menu.
-- All writes by staff go through API routes using the admin client; staff have
-- no direct DB access and no auth.users row.
--
-- TODO V3: hash PINs (bcrypt or argon2) once staff management scales beyond
-- single-restaurant pilots. For a 4-digit PIN on a shared dinner-service
-- tablet, plain text + HTTPS is acceptable for V2.

CREATE TABLE restaurant_staff (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id    uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name       text NOT NULL,                                     -- ACTIVE V2
  pin        text NOT NULL,                                     -- ACTIVE V2  -- 4-digit string, unique within menu
  role       text NOT NULL DEFAULT 'waiter'                     -- ACTIVE V2
             CHECK (role IN ('waiter', 'manager', 'cashier')),
  is_active  boolean NOT NULL DEFAULT true,                     -- ACTIVE V2
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_staff_menu_pin ON restaurant_staff(menu_id, pin);
CREATE INDEX idx_staff_menu ON restaurant_staff(menu_id);

ALTER TABLE restaurant_staff ENABLE ROW LEVEL SECURITY;

-- Owner-only access. Staff do NOT have auth.uid() rows; staff CRUD goes
-- through the API and admin client.
CREATE POLICY "owner_all" ON restaurant_staff FOR ALL
  USING (menu_id IN (SELECT id FROM menus WHERE business_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Activate table_sessions (created in 045, columns mostly nullable / dormant)
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 045 created table_sessions with: id, table_id, menu_id, status,
-- covers, waiter_id (uuid, no FK), opened_at, billed_at, paid_at,
-- payment_method, mpesa_ref, discount_pct, notes, created_at.
--
-- We need to:
--   - tighten status default + add 'open' as default explicitly
--   - upgrade waiter_id-style column to opened_by uuid → restaurant_staff
--     (045's waiter_id was a bare uuid — we'll keep it but also add a typed
--     opened_by column wired to restaurant_staff via FK)
--   - add covers default 1, NOT NULL
--   - add service_charge_pct, discount_pct (already exists, ensure default)
--   - add cached subtotal_kes, total_kes
--   - add closed_at lifecycle timestamp
-- IF NOT EXISTS guards make this safe to re-run on environments that already
-- partially have these columns.

ALTER TABLE table_sessions
  ADD COLUMN IF NOT EXISTS opened_by          uuid REFERENCES restaurant_staff(id) ON DELETE SET NULL, -- ACTIVE V2
  ADD COLUMN IF NOT EXISTS service_charge_pct numeric(5,2) NOT NULL DEFAULT 0,                          -- ACTIVE V2
  ADD COLUMN IF NOT EXISTS subtotal_kes       numeric(12,2),                                            -- ACTIVE V2 — cached
  ADD COLUMN IF NOT EXISTS total_kes          numeric(12,2),                                            -- ACTIVE V2 — cached
  ADD COLUMN IF NOT EXISTS closed_at          timestamptz;                                              -- ACTIVE V2

-- Tighten existing dormant columns from 045: covers (was nullable), discount_pct
-- (was nullable). Backfill nulls then set NOT NULL + DEFAULT.
UPDATE table_sessions SET covers = 1 WHERE covers IS NULL;
UPDATE table_sessions SET discount_pct = 0 WHERE discount_pct IS NULL;

ALTER TABLE table_sessions
  ALTER COLUMN covers       SET NOT NULL,
  ALTER COLUMN covers       SET DEFAULT 1,
  ALTER COLUMN discount_pct SET NOT NULL,
  ALTER COLUMN discount_pct SET DEFAULT 0,
  ALTER COLUMN status       SET NOT NULL,
  ALTER COLUMN opened_at    SET NOT NULL;

-- Tighten payment_method check to the V2 vocabulary (cash/card/mpesa).
-- 045 left this freeform.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'table_sessions_payment_method_check'
  ) THEN
    ALTER TABLE table_sessions
      ADD CONSTRAINT table_sessions_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'mpesa'));
  END IF;
END$$;

-- NOTE: Staff do not have Supabase Auth rows. All writes go through the admin
-- client in API routes that authenticate via the pos-staff-session cookie
-- (see /api/pos/_lib/auth.ts).

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. orders.waiter_id (table_session_id already added in 045)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS waiter_id uuid REFERENCES restaurant_staff(id) ON DELETE SET NULL; -- ACTIVE V2

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Menu-level service charge default
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS default_service_charge_pct numeric(5,2) NOT NULL DEFAULT 0; -- ACTIVE V2
