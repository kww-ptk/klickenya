-- listing_events: per-listing analytics tracking
CREATE TABLE listing_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_slug    text NOT NULL,
  listing_type    text NOT NULL,
  city            text,
  event_type      text NOT NULL,
  host_user_id    uuid REFERENCES auth.users(id),
  session_id      text,
  referrer        text,
  device          text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_listing_events_slug_date ON listing_events(listing_slug, created_at DESC);
CREATE INDEX idx_listing_events_host_date ON listing_events(host_user_id, created_at DESC);
CREATE INDEX idx_listing_events_type_date ON listing_events(event_type, created_at DESC);
CREATE INDEX idx_listing_events_city_date ON listing_events(city, created_at DESC);

ALTER TABLE listing_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous tracking)
CREATE POLICY "anon_insert_listing_events" ON listing_events
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can read
CREATE POLICY "auth_select_listing_events" ON listing_events
  FOR SELECT USING (auth.role() = 'authenticated');

-- Add digest opt-out column to host_profiles
ALTER TABLE host_profiles ADD COLUMN IF NOT EXISTS digest_unsubscribed boolean DEFAULT false;
