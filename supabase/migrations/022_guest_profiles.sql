-- Guest profiles — for travellers, locals, event-goers
CREATE TABLE guest_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  email text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_guest_profiles_user ON guest_profiles (user_id);

ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_guest_profile" ON guest_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_guest_profile" ON guest_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_guest_profile" ON guest_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Saved listings — heart/bookmark listings
CREATE TABLE saved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sanity_listing_id text NOT NULL,
  listing_title text,
  listing_type text,
  listing_city text,
  listing_slug text,
  listing_image_url text,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, sanity_listing_id)
);

CREATE INDEX idx_saved_listings_user ON saved_listings (user_id);

ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_saved" ON saved_listings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_saved" ON saved_listings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_saved" ON saved_listings
  FOR DELETE USING (user_id = auth.uid());

-- Event RSVPs — going / interested
CREATE TABLE event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sanity_event_id text NOT NULL,
  event_title text,
  event_date timestamptz,
  event_city text,
  event_slug text,
  status text DEFAULT 'going' CHECK (status IN ('going', 'interested')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, sanity_event_id)
);

CREATE INDEX idx_event_rsvps_user ON event_rsvps (user_id);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_rsvps" ON event_rsvps
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_rsvps" ON event_rsvps
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_rsvps" ON event_rsvps
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_delete_own_rsvps" ON event_rsvps
  FOR DELETE USING (user_id = auth.uid());

-- Link contact requests to guest accounts
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS guest_user_id uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_guest ON contact_requests (guest_user_id);
