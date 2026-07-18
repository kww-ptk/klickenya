-- 081_event_coupons.sql
-- Per-event discount coupons with atomic redemption caps. Deny-all RLS.

CREATE TABLE event_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sanity_id text NOT NULL,
  code text NOT NULL,                         -- stored uppercase
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value integer NOT NULL CHECK (discount_value >= 0),
  max_redemptions integer,                    -- NULL = unlimited
  redeemed integer NOT NULL DEFAULT 0 CHECK (redeemed >= 0),
  expires_at timestamptz,
  one_per_customer boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_role text NOT NULL DEFAULT 'host' CHECK (created_by_role IN ('host','admin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- One active code per event.
CREATE UNIQUE INDEX idx_event_coupons_code ON event_coupons (event_sanity_id, code) WHERE active;
CREATE INDEX idx_event_coupons_event ON event_coupons (event_sanity_id) WHERE active;

CREATE TABLE coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES event_coupons(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES ticket_orders(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  discount_kes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions (coupon_id);
CREATE INDEX idx_coupon_redemptions_email ON coupon_redemptions (coupon_id, buyer_email);

ALTER TABLE ticket_orders ADD COLUMN coupon_id uuid REFERENCES event_coupons(id) ON DELETE SET NULL;
ALTER TABLE ticket_orders ADD COLUMN discount_kes integer NOT NULL DEFAULT 0;

-- Atomic cap+expiry+active guard. Raises COUPON_UNAVAILABLE when exhausted/expired.
CREATE OR REPLACE FUNCTION reserve_coupon(p_coupon_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_updated integer;
BEGIN
  UPDATE event_coupons
     SET redeemed = redeemed + 1
   WHERE id = p_coupon_id
     AND active
     AND (max_redemptions IS NULL OR redeemed < max_redemptions)
     AND (expires_at IS NULL OR expires_at > now());
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RAISE EXCEPTION 'COUPON_UNAVAILABLE'; END IF;
END $$;

CREATE OR REPLACE FUNCTION release_coupon(p_coupon_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE event_coupons SET redeemed = GREATEST(0, redeemed - 1) WHERE id = p_coupon_id;
END $$;

ALTER TABLE event_coupons ENABLE ROW LEVEL SECURITY;      -- deny-all: adminClient only
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
