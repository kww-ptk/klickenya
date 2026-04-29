-- 058_manager_overrides_and_audit.sql
-- Manager-override foundation:
--   1. Per-menu discount threshold above which a manager PIN is required.
--   2. staff_audit_log capturing every restricted action — who did it, who
--      approved, and why. Owner reviews in the audit report.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. menus.manager_discount_threshold_pct
-- ─────────────────────────────────────────────────────────────────────────────
-- Default 10%. Owner can change in dashboard settings (later).

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS manager_discount_threshold_pct numeric(5,2) NOT NULL DEFAULT 10;  -- ACTIVE V2

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. staff_audit_log
-- ─────────────────────────────────────────────────────────────────────────────
-- Every restricted action a waiter takes (with a manager override) or a
-- manager takes directly is logged here. The owner never sees the raw rows
-- — they consume them through the audit report endpoint, which formats and
-- filters by date / staff / action.

CREATE TABLE IF NOT EXISTS staff_audit_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id               uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  -- Who initiated the action. Null on the rare path where the API can't
  -- attribute (e.g. owner-driven action via dashboard).
  acting_staff_id       uuid REFERENCES restaurant_staff(id) ON DELETE SET NULL,
  -- Who approved (the manager whose PIN unlocked the override). Same as
  -- acting_staff_id when a manager does it directly with no override needed.
  approving_staff_id    uuid REFERENCES restaurant_staff(id) ON DELETE SET NULL,
  action                text NOT NULL,    -- "discount_above_threshold" | "void_session" | "void_order_after_send"
  target_type           text NOT NULL,    -- "session" | "order"
  target_id             uuid NOT NULL,
  reason                text,
  metadata              jsonb,            -- e.g. { "discount_pct": 25, "previous_status": "billed" }
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_audit_log_menu_created
  ON staff_audit_log (menu_id, created_at DESC);

ALTER TABLE staff_audit_log ENABLE ROW LEVEL SECURITY;

-- Owner-only read; writes go through the API using the admin client.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_audit_log' AND policyname = 'owner_read'
  ) THEN
    CREATE POLICY "owner_read" ON staff_audit_log FOR SELECT
      USING (menu_id IN (SELECT id FROM menus WHERE business_id = auth.uid()));
  END IF;
END$$;
