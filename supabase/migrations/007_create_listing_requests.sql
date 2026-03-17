CREATE TABLE IF NOT EXISTS listing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  listing_type text NOT NULL,
  location text,
  description text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on listing_requests" ON listing_requests
  FOR ALL USING (auth.role() = 'service_role');
