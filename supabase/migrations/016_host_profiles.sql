CREATE TABLE host_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  city TEXT,
  website_url TEXT,
  social_url TEXT,
  claim_request_id UUID REFERENCES claim_requests(id),
  plan_tier TEXT DEFAULT 'basic',
  total_listings INTEGER DEFAULT 1,
  ghl_contact_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE host_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON host_profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Hosts can read own profile" ON host_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Hosts can update own profile" ON host_profiles
  FOR UPDATE USING (auth.uid() = id);
