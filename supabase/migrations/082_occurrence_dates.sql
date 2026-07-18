-- 082_occurrence_dates.sql
-- Date-bind tickets to a specific occurrence of a recurring event, and make
-- inventory per (event, tier, occurrence_date). Backward-compatible: existing
-- counter rows adopt the sentinel date (2000-01-01) and keep working;
-- non-recurring tickets store occurrence_date = NULL and reserve against the sentinel.

ALTER TABLE ticket_orders ADD COLUMN occurrence_date date;   -- NULL = non-recurring
ALTER TABLE tickets       ADD COLUMN occurrence_date date;

-- Re-key the inventory counter to include the occurrence date.
ALTER TABLE event_ticket_counters ADD COLUMN occurrence_date date NOT NULL DEFAULT DATE '2000-01-01';
ALTER TABLE event_ticket_counters DROP CONSTRAINT event_ticket_counters_pkey;
ALTER TABLE event_ticket_counters ADD PRIMARY KEY (event_sanity_id, tier_key, occurrence_date);

-- The reserve/release RPCs gain a p_occurrence_date arg — drop the old 2-arg
-- versions first (CREATE OR REPLACE can't change the signature).
DROP FUNCTION IF EXISTS reserve_event_tickets(text, jsonb);
DROP FUNCTION IF EXISTS release_event_tickets(text, jsonb);

CREATE FUNCTION reserve_event_tickets(
  p_event_sanity_id text,
  p_occurrence_date date,
  p_lines jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  line jsonb;
  v_updated integer;
BEGIN
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO event_ticket_counters (event_sanity_id, tier_key, occurrence_date, sold, capacity)
    VALUES (p_event_sanity_id, line->>'tier_key', p_occurrence_date, 0, NULLIF(line->>'capacity','')::integer)
    ON CONFLICT (event_sanity_id, tier_key, occurrence_date)
    DO UPDATE SET capacity = EXCLUDED.capacity;

    UPDATE event_ticket_counters
       SET sold = sold + (line->>'qty')::integer
     WHERE event_sanity_id = p_event_sanity_id
       AND tier_key = line->>'tier_key'
       AND occurrence_date = p_occurrence_date
       AND (capacity IS NULL OR sold + (line->>'qty')::integer <= capacity);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN RAISE EXCEPTION 'SOLD_OUT:%', line->>'tier_key'; END IF;
  END LOOP;
END $$;

CREATE FUNCTION release_event_tickets(
  p_event_sanity_id text,
  p_occurrence_date date,
  p_lines jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE line jsonb;
BEGIN
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    UPDATE event_ticket_counters
       SET sold = GREATEST(0, sold - (line->>'qty')::integer)
     WHERE event_sanity_id = p_event_sanity_id
       AND tier_key = line->>'tier_key'
       AND occurrence_date = p_occurrence_date;
  END LOOP;
END $$;
