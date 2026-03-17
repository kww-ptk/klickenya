CREATE TABLE IF NOT EXISTS ambassador_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  social_handle text,
  role text NOT NULL,
  city text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ambassador_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ambassador_applications" ON ambassador_applications
  FOR ALL USING (auth.role() = 'service_role');
