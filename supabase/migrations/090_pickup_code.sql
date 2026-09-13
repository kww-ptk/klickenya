-- 090_pickup_code.sql
-- A handover code the kitchen reads out and the rider types in.
--
-- Without it, "I have the food" is a rider asserting they collected
-- something. With it, collection requires a number only someone standing at
-- that counter has been told — which is what makes the timestamp mean
-- anything in a dispute, and stops a rider taking the wrong bag.
--
-- Deliberately NOT derived from the order id. A derived code cannot be
-- rotated, and anyone who worked out the derivation could collect any order.
-- Four digits, random per order, generated at placement.
--
-- Delivery orders only. Takeaway is handed to the customer who ordered it,
-- and dine-in never leaves the room.

alter table orders add column if not exists pickup_code text;

comment on column orders.pickup_code is
  'Four digits the kitchen gives the rider at handover; required to mark picked up. Delivery orders only (090).';
