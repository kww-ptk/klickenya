CREATE TABLE IF NOT EXISTS general_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE general_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on general_contacts" ON general_contacts
  FOR ALL USING (auth.role() = 'service_role');
