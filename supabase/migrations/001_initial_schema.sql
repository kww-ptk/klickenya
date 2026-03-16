-- ============================================================
-- Klickenya — 001_initial_schema.sql
-- Complete database schema: enums, extensions, tables, indexes,
-- full-text search, triggers, and search functions.
-- ============================================================

-- ─── Enums ──────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'host', 'guest');
CREATE TYPE listing_type AS ENUM ('stay', 'experience', 'event', 'rental', 'service');
CREATE TYPE listing_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE booking_type AS ENUM ('contact_form', 'instant', 'request');
CREATE TYPE price_unit AS ENUM ('night', 'person', 'day', 'session', 'ticket');
CREATE TYPE contact_status AS ENUM ('new', 'responded', 'converted', 'closed');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE payment_method AS ENUM ('card', 'mpesa');
CREATE TYPE property_category AS ENUM ('for-sale', 'for-rent', 'land', 'commercial');
CREATE TYPE property_type AS ENUM ('apartment', 'house', 'villa', 'studio', 'townhouse', 'land', 'commercial');
CREATE TYPE property_status AS ENUM ('available', 'under-offer', 'sold', 'let', 'draft');
CREATE TYPE agent_tier AS ENUM ('free', 'basic', 'pro', 'agency');

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Tables ─────────────────────────────────────────────────

-- users
CREATE TABLE users (
  id              uuid PRIMARY KEY REFERENCES auth.users,
  email           text UNIQUE NOT NULL,
  full_name       text,
  phone           text,
  avatar_url      text,
  role            user_role DEFAULT 'guest',
  is_verified     boolean DEFAULT false,
  stripe_account_id text,
  mpesa_number    text,
  created_at      timestamptz DEFAULT now()
);

-- listings
CREATE TABLE listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid REFERENCES users,
  slug            text UNIQUE NOT NULL,
  type            listing_type NOT NULL,
  status          listing_status DEFAULT 'draft',
  title           text NOT NULL,
  description     text,
  city            text,
  county          text,
  address         text,
  lat             decimal,
  lng             decimal,
  price           decimal,
  price_unit      price_unit,
  photos          text[] DEFAULT '{}',
  amenities       text[] DEFAULT '{}',
  tags            text[] DEFAULT '{}',
  max_guests      int,
  booking_type    booking_type DEFAULT 'contact_form',
  avg_rating      decimal DEFAULT 0,
  review_count    int DEFAULT 0,
  view_count      int DEFAULT 0,
  seo_title       text,
  seo_description text,
  embedding       vector(1536),
  created_at      timestamptz DEFAULT now(),
  published_at    timestamptz
);

-- contact_requests
CREATE TABLE contact_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid REFERENCES listings,
  full_name       text NOT NULL,
  email           text NOT NULL,
  phone           text NOT NULL,
  check_in        date,
  check_out       date,
  guests          int DEFAULT 1,
  message         text,
  status          contact_status DEFAULT 'new',
  notes           jsonb,
  created_at      timestamptz DEFAULT now()
);

-- blog_posts
CREATE TABLE blog_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid REFERENCES users,
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  excerpt         text,
  body            jsonb,
  cover_image     text,
  tags            text[] DEFAULT '{}',
  related_listing_ids uuid[] DEFAULT '{}',
  status          listing_status DEFAULT 'draft',
  reading_time    int,
  view_count      int DEFAULT 0,
  seo_title       text,
  seo_description text,
  embedding       vector(1536),
  published_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- agents (must be created before properties)
CREATE TABLE agents (
  id              uuid PRIMARY KEY REFERENCES users,
  slug            text UNIQUE NOT NULL,
  display_name    text NOT NULL,
  agency_name     text,
  licence_number  text,
  is_verified     boolean DEFAULT false,
  specialisations text[] DEFAULT '{}',
  service_areas   text[] DEFAULT '{}',
  subscription_tier agent_tier DEFAULT 'free',
  subscription_expires timestamptz,
  listing_count   int DEFAULT 0,
  total_leads     int DEFAULT 0,
  avg_rating      decimal DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- properties
CREATE TABLE properties (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid REFERENCES agents,
  owner_id        uuid REFERENCES users,
  slug            text UNIQUE NOT NULL,
  listing_category property_category NOT NULL,
  property_type   property_type,
  status          property_status DEFAULT 'draft',
  price           decimal,
  price_type      text DEFAULT 'total',
  bedrooms        int,
  bathrooms       int,
  size_sqm        decimal,
  land_size_acres decimal,
  year_built      int,
  neighbourhood   text,
  city            text,
  county          text,
  lat             decimal,
  lng             decimal,
  features        text[] DEFAULT '{}',
  description     text,
  photos          text[] DEFAULT '{}',
  is_new_development boolean DEFAULT false,
  view_count      int DEFAULT 0,
  save_count      int DEFAULT 0,
  enquiry_count   int DEFAULT 0,
  seo_title       text,
  seo_description text,
  embedding       vector(1536),
  published_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- property_enquiries
CREATE TABLE property_enquiries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid REFERENCES properties,
  agent_id        uuid REFERENCES agents,
  full_name       text,
  email           text,
  phone           text,
  message         text,
  enquiry_type    text,
  status          contact_status DEFAULT 'new',
  created_at      timestamptz DEFAULT now()
);

-- saved_properties
CREATE TABLE saved_properties (
  user_id         uuid REFERENCES users,
  property_id     uuid REFERENCES properties,
  saved_at        timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);

-- property_alerts
CREATE TABLE property_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users,
  email           text,
  neighbourhood   text,
  city            text,
  listing_category property_category,
  property_type   property_type,
  min_price       decimal,
  max_price       decimal,
  min_bedrooms    int,
  is_active       boolean DEFAULT true,
  last_notified   timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- valuations
CREATE TABLE valuations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid REFERENCES properties,
  neighbourhood   text,
  bedrooms        int,
  size_sqm        decimal,
  estimated_value decimal,
  range_min       decimal,
  range_max       decimal,
  confidence      text,
  reasoning       text,
  comparables_used int,
  is_paid_report  boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- activity_log
CREATE TABLE activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  entity_type     text,
  entity_id       uuid,
  actor_id        uuid,
  payload         jsonb,
  created_at      timestamptz DEFAULT now()
);

-- api_keys
CREATE TABLE api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  key_hash        text NOT NULL UNIQUE,
  scopes          text[] DEFAULT '{}',
  owner_id        uuid REFERENCES users,
  last_used       timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- external_calendars
CREATE TABLE external_calendars (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid REFERENCES listings ON DELETE CASCADE,
  platform        text,
  ical_url        text NOT NULL,
  last_synced_at  timestamptz,
  sync_errors     int DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- newsletter_subscribers
CREATE TABLE newsletter_subscribers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- bookings
CREATE TABLE bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid REFERENCES listings,
  guest_id        uuid REFERENCES users,
  check_in        date,
  check_out       date,
  guests          int,
  total_price     decimal,
  platform_fee    decimal,
  host_payout     decimal,
  status          booking_status DEFAULT 'pending',
  payment_method  payment_method,
  stripe_pi_id    text,
  mpesa_transaction_id text,
  created_at      timestamptz DEFAULT now()
);

-- availability
CREATE TABLE availability (
  listing_id      uuid REFERENCES listings,
  date            date,
  status          text DEFAULT 'available',
  PRIMARY KEY (listing_id, date)
);

-- reviews
CREATE TABLE reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid REFERENCES listings,
  booking_id      uuid REFERENCES bookings,
  author_id       uuid REFERENCES users,
  rating          decimal CHECK (rating >= 1 AND rating <= 5),
  body            text,
  created_at      timestamptz DEFAULT now()
);

-- ─── Indexes (btree) ────────────────────────────────────────
CREATE INDEX ON listings (type, city, status);
CREATE INDEX ON listings (city);
CREATE INDEX ON listings (status);
CREATE INDEX ON listings (owner_id);
CREATE INDEX ON blog_posts (status, published_at DESC);
CREATE INDEX ON contact_requests (listing_id, status);
CREATE INDEX ON contact_requests (status, created_at DESC);
CREATE INDEX ON activity_log (event_type, created_at DESC);
CREATE INDEX ON properties (listing_category, city, status);
CREATE INDEX ON properties (neighbourhood, listing_category);
CREATE INDEX ON properties (agent_id);
CREATE INDEX ON property_enquiries (property_id, status);
CREATE INDEX ON property_alerts (is_active, listing_category);
CREATE INDEX ON bookings (listing_id, status);
CREATE INDEX ON bookings (guest_id);
CREATE INDEX ON availability (listing_id, date);
CREATE INDEX ON reviews (listing_id);
CREATE INDEX ON valuations (neighbourhood, bedrooms);

-- ─── GIN indexes for array search ───────────────────────────
CREATE INDEX ON listings USING GIN (tags);
CREATE INDEX ON listings USING GIN (amenities);
CREATE INDEX ON properties USING GIN (features);
CREATE INDEX ON blog_posts USING GIN (tags);

-- ─── ivfflat indexes for pgvector ───────────────────────────
CREATE INDEX ON listings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON blog_posts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON properties USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── Full-text search ───────────────────────────────────────

ALTER TABLE listings ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title,'') || ' ' ||
      coalesce(city,'') || ' ' ||
      coalesce(county,'') || ' ' ||
      coalesce(description,'')
    )
  ) STORED;
CREATE INDEX ON listings USING GIN (search_vector);

ALTER TABLE blog_posts ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title,'') || ' ' ||
      coalesce(excerpt,'')
    )
  ) STORED;
CREATE INDEX ON blog_posts USING GIN (search_vector);

ALTER TABLE properties ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(neighbourhood,'') || ' ' ||
      coalesce(city,'') || ' ' ||
      coalesce(county,'') || ' ' ||
      coalesce(description,'')
    )
  ) STORED;
CREATE INDEX ON properties USING GIN (search_vector);

-- ─── Triggers ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_listing_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE listings SET
    avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)),
    review_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id))
  WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_change
  AFTER INSERT OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_listing_rating();

-- ─── Search functions ───────────────────────────────────────

CREATE OR REPLACE FUNCTION search_listings(
  query text,
  listing_type_filter text DEFAULT NULL,
  city_filter text DEFAULT NULL
) RETURNS SETOF listings AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM listings
  WHERE
    search_vector @@ plainto_tsquery('english', query)
    AND status = 'published'
    AND (listing_type_filter IS NULL OR type::text = listing_type_filter)
    AND (city_filter IS NULL OR lower(city) = lower(city_filter))
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', query)) DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_properties(
  query text,
  category_filter text DEFAULT NULL,
  city_filter text DEFAULT NULL
) RETURNS SETOF properties AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM properties
  WHERE
    search_vector @@ plainto_tsquery('english', query)
    AND status = 'available'
    AND (category_filter IS NULL OR listing_category::text = category_filter)
    AND (city_filter IS NULL OR lower(city) = lower(city_filter))
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', query)) DESC;
END;
$$ LANGUAGE plpgsql;
