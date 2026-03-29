-- Events submitted by hosts, tracked for moderation
CREATE TABLE events_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sanity_event_id text,
  host_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  city text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  is_new_host boolean DEFAULT false
);

-- Indexes
CREATE INDEX idx_events_pending_host ON events_pending (host_id);
CREATE INDEX idx_events_pending_status ON events_pending (status);

-- RLS
ALTER TABLE events_pending ENABLE ROW LEVEL SECURITY;

-- Hosts can read their own events
CREATE POLICY "hosts_select_own_events" ON events_pending
  FOR SELECT USING (host_id = auth.uid());

-- Hosts can insert their own events
CREATE POLICY "hosts_insert_own_events" ON events_pending
  FOR INSERT WITH CHECK (host_id = auth.uid());

-- Service role (admin) has full access via supabase admin client
