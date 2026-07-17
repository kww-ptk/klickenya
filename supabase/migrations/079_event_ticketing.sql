-- 079_event_ticketing.sql
-- Unified event ticketing: orders, tickets, atomic inventory, ledger.
-- Tier definitions live in Sanity listing.ticketTypes (keyed by _key);
-- everything transactional lives here. RLS is deny-all: adminClient only.

-- ── Orders ──────────────────────────────────────────────────────────────
CREATE TABLE ticket_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sanity_id text NOT NULL,
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','expired','cancelled','refunded')),
  currency text NOT NULL DEFAULT 'KES',
  subtotal_kes integer NOT NULL CHECK (subtotal_kes >= 0),
  total_kes integer NOT NULL CHECK (total_kes >= 0),
  platform_fee_bps integer NOT NULL DEFAULT 0,
  -- line-item snapshot: [{tier_key, tier_name, unit_price_kes, qty}]
  lines jsonb NOT NULL,
  provider text NOT NULL DEFAULT 'free'
    CHECK (provider IN ('free','paystack','daraja')),
  provider_ref text,                       -- Paystack reference (= order id)
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  expires_at timestamptz                   -- pending orders released after this
);
CREATE INDEX idx_ticket_orders_event   ON ticket_orders (event_sanity_id);
CREATE INDEX idx_ticket_orders_status  ON ticket_orders (status, expires_at);
CREATE UNIQUE INDEX idx_ticket_orders_provider_ref
  ON ticket_orders (provider_ref) WHERE provider_ref IS NOT NULL;

-- ── Tickets ─────────────────────────────────────────────────────────────
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ticket_orders(id) ON DELETE RESTRICT,
  event_sanity_id text NOT NULL,
  tier_key text NOT NULL,                  -- Sanity ticketTypes[]._key ('free' for free events)
  tier_name text NOT NULL,
  price_kes integer NOT NULL DEFAULT 0,
  code text NOT NULL UNIQUE,               -- random base32, encoded in the QR
  attendee_name text NOT NULL,
  attendee_email text NOT NULL,
  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued','checked_in','cancelled')),
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_event ON tickets (event_sanity_id, status);
CREATE INDEX idx_tickets_order ON tickets (order_id);

-- ── Inventory counters (capacity enforcement) ───────────────────────────
CREATE TABLE event_ticket_counters (
  event_sanity_id text NOT NULL,
  tier_key text NOT NULL,
  sold integer NOT NULL DEFAULT 0 CHECK (sold >= 0),
  capacity integer,                        -- NULL = unlimited
  PRIMARY KEY (event_sanity_id, tier_key)
);

-- Atomically reserve seats for every line of an order. p_lines:
--   [{"tier_key":"abc","qty":2,"capacity":100}, ...]
-- Upserts the counter row (capacity refreshed from Sanity at checkout time),
-- then increments sold iff capacity allows. Raises on any sold-out tier so
-- the whole reservation rolls back together.
CREATE OR REPLACE FUNCTION reserve_event_tickets(
  p_event_sanity_id text,
  p_lines jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  line jsonb;
  v_updated integer;
BEGIN
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO event_ticket_counters (event_sanity_id, tier_key, sold, capacity)
    VALUES (
      p_event_sanity_id,
      line->>'tier_key',
      0,
      NULLIF(line->>'capacity','')::integer
    )
    ON CONFLICT (event_sanity_id, tier_key)
    DO UPDATE SET capacity = EXCLUDED.capacity;

    UPDATE event_ticket_counters
       SET sold = sold + (line->>'qty')::integer
     WHERE event_sanity_id = p_event_sanity_id
       AND tier_key = line->>'tier_key'
       AND (capacity IS NULL OR sold + (line->>'qty')::integer <= capacity);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'SOLD_OUT:%', line->>'tier_key';
    END IF;
  END LOOP;
END $$;

-- Release seats (order expiry / cancellation).
CREATE OR REPLACE FUNCTION release_event_tickets(
  p_event_sanity_id text,
  p_lines jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE line jsonb;
BEGIN
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    UPDATE event_ticket_counters
       SET sold = GREATEST(0, sold - (line->>'qty')::integer)
     WHERE event_sanity_id = p_event_sanity_id
       AND tier_key = line->>'tier_key';
  END LOOP;
END $$;

-- ── RLS: deny-all (adminClient/service-role only) ───────────────────────
ALTER TABLE ticket_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ticket_counters ENABLE ROW LEVEL SECURITY;

-- ── Audit fix: event_attendees PII was publicly selectable ──────────────
DROP POLICY IF EXISTS "public_select_attendees" ON event_attendees;
-- Join inserts now happen via adminClient in the checkout route:
DROP POLICY IF EXISTS "anyone_can_join" ON event_attendees;
