-- Migration 040: Add guest_user_id to bookings
-- Allows logged-in guests to see their own bookings

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_guest_user_id
  ON public.bookings (guest_user_id);

-- Guests can read their own bookings
CREATE POLICY "guests_read_own_bookings"
  ON public.bookings
  FOR SELECT
  USING (guest_user_id = auth.uid());
