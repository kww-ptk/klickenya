-- 055_pos_realtime_publication.sql
-- Enables Supabase realtime on the two tables the POS terminal subscribes to.
-- After this runs, any INSERT / UPDATE / DELETE on `orders` or
-- `table_sessions` is broadcast to subscribed clients within ~150 ms.
--
-- The session detail page (/pos/[slug]/tables/[tableId]) opens a single
-- channel per session_id and listens for changes. New guest QR orders show
-- up on the waiter's screen almost instantly instead of waiting for the
-- next 8-second poll cycle.
--
-- The tables grid (/pos/[slug]/tables) deliberately keeps polling — one
-- channel per table at 30+ tables is more cost than 5-second polling, and
-- the perceived latency on the grid is fine.
--
-- Idempotent — DO blocks check publication membership before adding.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'table_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.table_sessions';
  END IF;
END$$;
