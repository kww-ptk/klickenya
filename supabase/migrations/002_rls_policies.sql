-- ============================================================
-- Klickenya — 002_rls_policies.sql
-- Row Level Security policies for all tables.
-- ============================================================

-- ─── Enable RLS on all tables ───────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- ─── Helper function ────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── users ──────────────────────────────────────────────────
CREATE POLICY "Users can view own row"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own row"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

-- ─── listings ───────────────────────────────────────────────
CREATE POLICY "Public can view published listings"
  ON listings FOR SELECT
  USING (status = 'published');

CREATE POLICY "Owners can view own listings"
  ON listings FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert own listings"
  ON listings FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own listings"
  ON listings FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete own listings"
  ON listings FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Admins have full access to listings"
  ON listings FOR ALL
  USING (is_admin());

-- ─── contact_requests ───────────────────────────────────────
CREATE POLICY "Anyone can submit contact requests"
  ON contact_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Listing owners can view their enquiries"
  ON contact_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = contact_requests.listing_id
        AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all contact requests"
  ON contact_requests FOR SELECT
  USING (is_admin());

-- ─── blog_posts ─────────────────────────────────────────────
CREATE POLICY "Public can view published blog posts"
  ON blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins have full access to blog posts"
  ON blog_posts FOR ALL
  USING (is_admin());

-- ─── properties ─────────────────────────────────────────────
CREATE POLICY "Public can view available properties"
  ON properties FOR SELECT
  USING (status IN ('available', 'under-offer'));

CREATE POLICY "Owners can manage own properties"
  ON properties FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Agents can manage own properties"
  ON properties FOR ALL
  USING (agent_id = auth.uid());

CREATE POLICY "Admins have full access to properties"
  ON properties FOR ALL
  USING (is_admin());

-- ─── agents ─────────────────────────────────────────────────
CREATE POLICY "Public can view agents"
  ON agents FOR SELECT
  USING (true);

CREATE POLICY "Agents can update own profile"
  ON agents FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins have full access to agents"
  ON agents FOR ALL
  USING (is_admin());

-- ─── property_enquiries ─────────────────────────────────────
CREATE POLICY "Anyone can submit property enquiries"
  ON property_enquiries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Agents can view own property enquiries"
  ON property_enquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_enquiries.property_id
        AND properties.agent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all property enquiries"
  ON property_enquiries FOR SELECT
  USING (is_admin());

-- ─── saved_properties ───────────────────────────────────────
CREATE POLICY "Users can view own saved properties"
  ON saved_properties FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can save properties"
  ON saved_properties FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave properties"
  ON saved_properties FOR DELETE
  USING (user_id = auth.uid());

-- ─── property_alerts ────────────────────────────────────────
CREATE POLICY "Users can manage own alerts"
  ON property_alerts FOR ALL
  USING (user_id = auth.uid());

-- ─── bookings ───────────────────────────────────────────────
CREATE POLICY "Guests can view own bookings"
  ON bookings FOR SELECT
  USING (guest_id = auth.uid());

CREATE POLICY "Listing owners can view bookings for their listings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = bookings.listing_id
        AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to bookings"
  ON bookings FOR ALL
  USING (is_admin());

-- ─── reviews ────────────────────────────────────────────────
CREATE POLICY "Public can view all reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Guests can create reviews for completed bookings"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
        AND bookings.guest_id = auth.uid()
        AND bookings.status = 'completed'
    )
  );

CREATE POLICY "Admins can delete reviews"
  ON reviews FOR DELETE
  USING (is_admin());

-- ─── newsletter_subscribers ─────────────────────────────────
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (is_admin());

-- ─── activity_log ───────────────────────────────────────────
CREATE POLICY "Admins only on activity log"
  ON activity_log FOR ALL
  USING (is_admin());

-- ─── api_keys ───────────────────────────────────────────────
CREATE POLICY "Admins only on api keys"
  ON api_keys FOR ALL
  USING (is_admin());

-- ─── valuations ─────────────────────────────────────────────
CREATE POLICY "Public can view valuations"
  ON valuations FOR SELECT
  USING (true);

CREATE POLICY "Admins have full access to valuations"
  ON valuations FOR ALL
  USING (is_admin());

-- ─── availability ───────────────────────────────────────────
CREATE POLICY "Public can view availability"
  ON availability FOR SELECT
  USING (true);

CREATE POLICY "Listing owners can manage availability"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = availability.listing_id
        AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to availability"
  ON availability FOR ALL
  USING (is_admin());

-- ─── external_calendars ─────────────────────────────────────
CREATE POLICY "Listing owners can manage their calendars"
  ON external_calendars FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = external_calendars.listing_id
        AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to external calendars"
  ON external_calendars FOR ALL
  USING (is_admin());
