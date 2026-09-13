-- 091_delivery_staff_role.sql
-- A staff role for the people who work delivery orders.
--
-- Roles decide which screen a PIN opens. Until now the only options were
-- waiter, cashier, kitchen, bar and manager — so whoever handles deliveries
-- got added as a "waiter", their PIN opened the POS tables screen, and the
-- PIN looked broken when it was the role that was wrong.
--
-- 'delivery' is shown to owners as "Food Delivery Station" and opens the
-- Food Delivery Orders screen.

alter table restaurant_staff drop constraint if exists restaurant_staff_role_check;
alter table restaurant_staff add constraint restaurant_staff_role_check
  CHECK (role IN ('waiter', 'manager', 'cashier', 'kitchen', 'bar', 'delivery'));

comment on column restaurant_staff.role is
  'Decides which screen the PIN opens. delivery|kitchen|bar|manager -> Food Delivery Orders; waiter|cashier -> POS.';
