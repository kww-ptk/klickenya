-- 057_kitchen_staff_role.sql
-- Extend restaurant_staff.role to allow 'kitchen' so kitchen line cooks can
-- sign into the new /kitchen/[slug] terminal with their own PIN. Mirrors
-- the waiter PIN flow — same staff cookie, same auth helper, scoped to the
-- kitchen view only.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'restaurant_staff_role_check'
  ) THEN
    ALTER TABLE restaurant_staff DROP CONSTRAINT restaurant_staff_role_check;
  END IF;
END$$;

ALTER TABLE restaurant_staff
  ADD CONSTRAINT restaurant_staff_role_check
  CHECK (role IN ('waiter', 'manager', 'cashier', 'kitchen'));  -- ACTIVE V2
