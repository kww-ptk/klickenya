-- 070_station_routing.sql
-- Adds optional bar/kitchen routing to the menu ordering system.
-- All changes are backwards compatible: defaults preserve combined-screen behaviour.

------------------------------------------------------------
-- Schema changes
------------------------------------------------------------

ALTER TABLE menu_sections
  ADD COLUMN IF NOT EXISTS station text NOT NULL DEFAULT 'kitchen'
    CHECK (station IN ('kitchen','bar'));

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS order_view_mode text NOT NULL DEFAULT 'combined'
    CHECK (order_view_mode IN ('combined','split'));

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS station text NOT NULL DEFAULT 'kitchen'
    CHECK (station IN ('kitchen','bar'));

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS station_status text NOT NULL DEFAULT 'new'
    CHECK (station_status IN ('new','preparing','ready','delivered','cancelled'));

-- Non-CONCURRENT because Supabase migrations run inside a transaction.
-- Volume on order_items is small; lock contention is acceptable.
CREATE INDEX idx_order_items_station_status
  ON order_items (station, station_status)
  WHERE station_status IN ('new','preparing','ready');

------------------------------------------------------------
-- Backfill: every existing non-voided row gets station_status = parent
-- orders.status (DEFAULT 'kitchen' already covers the station column).
-- Voided rows keep the default 'new' value — they're excluded from the
-- aggregate anyway, so the value is inert.
------------------------------------------------------------

UPDATE order_items oi
SET station_status = o.status
FROM orders o
WHERE oi.order_id = o.id
  AND oi.is_voided = false;

------------------------------------------------------------
-- derive_order_status(order_id)
--
-- Collapses the multiset of per-item station_status values into one
-- orders.status. Two important invariants:
--
--   (a) is_voided=true items are excluded from the aggregate entirely
--       (a voided line is removed from the bill; it should not pin
--       the order at "preparing" forever).
--   (b) station_status='cancelled' items are excluded from the
--       active-items aggregate but counted toward the "everything
--       cancelled" check.
--
-- FSM applied to the non-voided items:
--   1. If every non-voided item is cancelled  -> 'cancelled'
--   2. Otherwise, among the non-voided non-cancelled "active" items:
--        - all delivered                          -> 'delivered'
--        - all in {ready, delivered}              -> 'ready'
--        - all new                                -> 'new'
--        - anything else (mixed / any preparing)  -> 'preparing'
--
-- Terminal-order safeguard: if orders.status is already 'cancelled'
-- or 'delivered', we never overwrite it. Prevents UI bugs from
-- resurrecting a closed ticket.
--
-- Concurrency note: this function is intentionally lock-free. Under READ
-- COMMITTED, two concurrent station_status updates each fire the trigger and
-- each recompute the full aggregate from their own visibility. The last
-- commit's UPDATE on orders.status wins — which is correct for that
-- transaction's view of the items. Brief disagreement between orders.status
-- and the multiset is possible mid-flight; both settle to consistent values
-- once commits land. No SELECT FOR UPDATE is needed for the kitchen flow.
------------------------------------------------------------

CREATE OR REPLACE FUNCTION derive_order_status(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total      int;
  v_cancelled  int;
  v_delivered  int;
  v_ready      int;
  v_new        int;
  v_active     int;
  v_new_status text;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE station_status = 'cancelled'),
    count(*) FILTER (WHERE station_status = 'delivered'),
    count(*) FILTER (WHERE station_status = 'ready'),
    count(*) FILTER (WHERE station_status = 'new')
  INTO v_total, v_cancelled, v_delivered, v_ready, v_new
  FROM order_items
  WHERE order_id = p_order_id
    AND is_voided = false;

  IF v_total = 0 THEN
    RETURN;  -- only voided items (or none); leave orders.status alone
  END IF;

  IF v_cancelled = v_total THEN
    v_new_status := 'cancelled';
  ELSE
    v_active := v_total - v_cancelled;
    IF v_delivered = v_active THEN
      v_new_status := 'delivered';
    ELSIF (v_ready + v_delivered) = v_active THEN
      v_new_status := 'ready';
    ELSIF v_new = v_active THEN
      v_new_status := 'new';
    ELSE
      v_new_status := 'preparing';
    END IF;
  END IF;

  UPDATE orders
  SET status = v_new_status
  WHERE id = p_order_id
    AND status NOT IN ('cancelled','delivered')   -- terminal-order safeguard
    AND status IS DISTINCT FROM v_new_status;
END;
$$;

------------------------------------------------------------
-- Trigger: recompute orders.status when station_status changes, OR when
-- an item gets voided (is_voided false -> true). INSERT is not handled
-- because new rows arrive with default 'new' and orders.status is set
-- to 'new' by the API at insert time.
------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_order_items_derive_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM derive_order_status(NEW.order_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_derive_status ON order_items;
CREATE TRIGGER order_items_derive_status
AFTER UPDATE OF station_status, is_voided ON order_items
FOR EACH ROW
WHEN (
  OLD.station_status IS DISTINCT FROM NEW.station_status
  OR (OLD.is_voided = false AND NEW.is_voided = true)
)
EXECUTE FUNCTION trg_order_items_derive_status();
