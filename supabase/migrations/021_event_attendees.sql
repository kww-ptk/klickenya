-- Event attendees — people who join/RSVP to events
CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_sanity_id text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  joined_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_event_attendees_event ON event_attendees (event_sanity_id);
CREATE INDEX idx_event_attendees_email ON event_attendees (event_sanity_id, email);

-- RLS
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Anyone can join (INSERT)
CREATE POLICY "anyone_can_join" ON event_attendees
  FOR INSERT WITH CHECK (true);

-- Public can see attendees (for count + avatars)
CREATE POLICY "public_select_attendees" ON event_attendees
  FOR SELECT USING (true);
