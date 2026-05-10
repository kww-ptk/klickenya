-- Migration 071: Setup wizard state + reservation invariants.
--
-- Purpose:
--   1. Track per-step "answered" state on menus so the dashboard banner can
--      tell "owner explicitly said no" apart from "owner has not been asked
--      yet" (boolean flags default false — the timestamps disambiguate).
--   2. Track top-level setup completion / dismissal for banner visibility.
--   3. Capture takeaway / delivery interest as waitlist booleans.
--   4. Extend reservation_time_windows with weekdays + capacity (used by the
--      wizard's Step 2 mini-form; both columns are nullable / safely defaulted
--      so no existing readers break).
--   5. Enforce: reservations_enabled = true requires ≥1 active window. The
--      forward guard lives in /api/menu/settings (returns 400 with
--      error: "no_active_windows"); the converse guard is a DB trigger that
--      flips reservations_enabled false whenever the last active window for a
--      menu disappears (DELETE or is_active flipped to false).
--   6. Ship an atomic RPC fn_setup_enable_reservations(...) that the wizard
--      calls in Step 2 — inserts the window(s) AND flips the flag in one
--      transaction. If the window insert fails (CHECK violation, etc.) the
--      flag flip rolls back automatically.
--
-- Schema-decision note: chose nullable timestamptz <flag>_decided_at columns
-- over a single jsonb setup_step_answered. Each step's "answered" state lives
-- next to the flag it gates; the resolver becomes a chain of IS NULL checks;
-- jsonb would have required runtime key-space discipline for no benefit.
--
-- Reversal (manual; run in reverse order):
--   DROP TRIGGER  IF EXISTS trg_reservation_windows_invariant ON reservation_time_windows;
--   DROP FUNCTION IF EXISTS fn_enforce_reservation_invariant();
--   DROP FUNCTION IF EXISTS fn_setup_enable_reservations(uuid, int, int, int, jsonb);
--   ALTER TABLE reservation_time_windows
--     DROP CONSTRAINT IF EXISTS check_open_before_close,
--     DROP COLUMN     IF EXISTS weekdays,
--     DROP COLUMN     IF EXISTS capacity;
--   ALTER TABLE menus
--     DROP COLUMN IF EXISTS setup_completed_at,
--     DROP COLUMN IF EXISTS setup_dismissed_at,
--     DROP COLUMN IF EXISTS reservations_decided_at,
--     DROP COLUMN IF EXISTS table_ordering_decided_at,
--     DROP COLUMN IF EXISTS stock_decided_at,
--     DROP COLUMN IF EXISTS takeaway_waitlist,
--     DROP COLUMN IF EXISTS delivery_waitlist;

-- ─── menus: setup state ────────────────────────────────────────────────────
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS setup_completed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS setup_dismissed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS reservations_decided_at    timestamptz,
  ADD COLUMN IF NOT EXISTS table_ordering_decided_at  timestamptz,
  ADD COLUMN IF NOT EXISTS stock_decided_at           timestamptz,
  ADD COLUMN IF NOT EXISTS takeaway_waitlist          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_waitlist          boolean NOT NULL DEFAULT false;

-- ─── reservation_time_windows: weekdays + capacity ─────────────────────────
-- weekdays: array of ISO weekday numbers (0 = Sunday, matching JS Date.getDay).
--   NULL or empty array = active every day (back-compat with existing rows).
-- capacity: max simultaneous covers the slot can host. NULL = uncapped.
ALTER TABLE reservation_time_windows
  ADD COLUMN IF NOT EXISTS weekdays  int[],
  ADD COLUMN IF NOT EXISTS capacity  int;

-- ─── reservation_time_windows: open<close invariant ───────────────────────
-- Existing rows assumed valid (none observed violating). If any violate this,
-- migration will fail loudly — that's the desired behaviour (cleanup before
-- proceeding rather than silently NOT VALID-ing).
ALTER TABLE reservation_time_windows
  ADD CONSTRAINT check_open_before_close
  CHECK (open_time < close_time);

-- ─── Trigger: enforce reservations invariant on window changes ────────────
-- After any UPDATE or DELETE on reservation_time_windows, recompute the count
-- of active windows for the affected menu. If zero remain AND the menu still
-- has reservations_enabled = true, flip it false in the same statement so the
-- safety hole cannot reopen. Inserts are exempt (adding a window cannot break
-- the invariant).
CREATE OR REPLACE FUNCTION fn_enforce_reservation_invariant()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  affected_menu_id uuid;
  active_count     int;
BEGIN
  affected_menu_id := COALESCE(OLD.menu_id, NEW.menu_id);

  SELECT count(*) INTO active_count
    FROM reservation_time_windows
    WHERE menu_id = affected_menu_id
      AND is_active = true;

  IF active_count = 0 THEN
    UPDATE menus
       SET reservations_enabled = false
     WHERE id = affected_menu_id
       AND reservations_enabled = true;
  END IF;

  RETURN NULL; -- AFTER trigger; no row return needed
END;
$$;

DROP TRIGGER IF EXISTS trg_reservation_windows_invariant ON reservation_time_windows;
CREATE TRIGGER trg_reservation_windows_invariant
  AFTER UPDATE OR DELETE
  ON reservation_time_windows
  FOR EACH ROW
  EXECUTE FUNCTION fn_enforce_reservation_invariant();

-- ─── RPC: atomic Step-2 submit (insert windows + flip flag) ───────────────
-- Wizard POSTs to /api/setup/reservations, the route validates input then
-- invokes this RPC. SECURITY DEFINER so it can write through RLS using the
-- service-role grant (the route already verifies ownership before calling).
--
-- p_windows: jsonb array of objects with shape:
--   { open_time: 'HH:MM', close_time: 'HH:MM', label: text|null,
--     weekdays: int[]|null, capacity: int|null, display_order: int|null }
--
-- Raises: 'no_active_windows' (caught by route → 400)
-- Raises: any CHECK / NOT NULL violation from the underlying inserts (caught
--   by route → 400). Because the whole function is one transaction, a failure
--   half-way through rolls the flag flip back too.
CREATE OR REPLACE FUNCTION fn_setup_enable_reservations(
  p_menu_id            uuid,
  p_max_party_size     int,
  p_lead_time_hours    int,
  p_max_advance_days   int,
  p_windows            jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  win        jsonb;
  win_count  int;
  win_idx    int := 0;
BEGIN
  win_count := COALESCE(jsonb_array_length(p_windows), 0);
  IF win_count < 1 THEN
    RAISE EXCEPTION 'no_active_windows';
  END IF;

  FOR win IN SELECT * FROM jsonb_array_elements(p_windows) LOOP
    INSERT INTO reservation_time_windows (
      menu_id, open_time, close_time, label,
      weekdays, capacity, is_active, display_order
    ) VALUES (
      p_menu_id,
      (win->>'open_time')::time,
      (win->>'close_time')::time,
      NULLIF(win->>'label', ''),
      CASE WHEN jsonb_typeof(win->'weekdays') = 'array'
           THEN ARRAY(SELECT jsonb_array_elements_text(win->'weekdays'))::int[]
           ELSE NULL END,
      NULLIF(win->>'capacity', '')::int,
      true,
      COALESCE(NULLIF(win->>'display_order', '')::int, win_idx)
    );
    win_idx := win_idx + 1;
  END LOOP;

  UPDATE menus
     SET reservations_enabled         = true,
         reservations_decided_at      = now(),
         reservations_max_party_size  = p_max_party_size,
         reservations_lead_time_hours = p_lead_time_hours,
         reservations_max_advance_days = p_max_advance_days
   WHERE id = p_menu_id;
END;
$$;

-- ─── Index to keep the resolver query fast ────────────────────────────────
-- The dashboard banner reads (is_published, reservations_decided_at,
-- table_ordering_decided_at, stock_decided_at, setup_completed_at,
-- setup_dismissed_at) for the owner's menu on every dashboard render. The
-- existing PK on menus.id covers single-row lookups, but a partial index on
-- "menus that haven't finished setup" speeds the dashboard listing query.
CREATE INDEX IF NOT EXISTS idx_menus_setup_pending
  ON menus (business_id)
  WHERE setup_completed_at IS NULL AND setup_dismissed_at IS NULL;
