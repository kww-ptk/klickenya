-- Migration 042: Add guest_user_id to contact_requests
-- Allows logged-in guests to see their own enquiries, and enables
-- the convert route to link bookings to guest accounts automatically.

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS guest_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_requests_guest_user_id
  ON public.contact_requests (guest_user_id);

-- Guests can read their own enquiries
CREATE POLICY "guests_read_own_enquiries"
  ON public.contact_requests
  FOR SELECT
  USING (guest_user_id = auth.uid());
