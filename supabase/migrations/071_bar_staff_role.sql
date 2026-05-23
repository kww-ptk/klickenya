-- 071_bar_staff_role.sql
-- Extend restaurant_staff.role to allow 'bar' so dedicated bar staff can
-- log in via the PIN flow and see only their station's tickets.

ALTER TABLE restaurant_staff
  DROP CONSTRAINT IF EXISTS restaurant_staff_role_check;

ALTER TABLE restaurant_staff
  ADD CONSTRAINT restaurant_staff_role_check
  CHECK (role IN ('waiter', 'manager', 'cashier', 'kitchen', 'bar'));  -- ACTIVE V2
