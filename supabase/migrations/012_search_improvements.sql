-- 012: Search improvements — trigram indexes + search_log table
-- Run against Supabase SQL Editor

-- 1. Enable pg_trgm extension for fuzzy/similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;

-- 2. Trigram GIN indexes for fuzzy matching on title and city
CREATE INDEX IF NOT EXISTS listings_title_trgm
  ON listings USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS listings_city_trgm
  ON listings USING GIN (city gin_trgm_ops);

-- 3. Search log table for analytics + popular search suggestions
CREATE TABLE IF NOT EXISTS search_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  result_count int DEFAULT 0,
  type_filter text,
  city_filter text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_log_query_created
  ON search_log (query, created_at DESC);

-- 4. Trigram similarity fallback function
--    Called when FTS returns fewer than 3 results
CREATE OR REPLACE FUNCTION search_listings_trigram(
  search_query text,
  listing_type_filter text DEFAULT NULL,
  city_filter text DEFAULT NULL,
  result_limit int DEFAULT 6
)
RETURNS SETOF listings
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM listings
  WHERE status = 'published'
    AND (
      public.similarity(title, search_query) > 0.2
      OR public.similarity(city, search_query) > 0.3
    )
    AND (listing_type_filter IS NULL OR type::text = listing_type_filter)
    AND (city_filter IS NULL OR city ILIKE city_filter)
  ORDER BY public.similarity(title, search_query) DESC
  LIMIT result_limit;
$$;

-- 5. Popular searches aggregation function
--    Returns top N most-searched queries since a given date
CREATE OR REPLACE FUNCTION get_popular_searches(
  since timestamptz,
  result_limit int DEFAULT 10
)
RETURNS TABLE(query text, search_count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    sl.query,
    count(*) AS search_count
  FROM search_log sl
  WHERE sl.created_at >= since
    AND length(sl.query) >= 2
  GROUP BY sl.query
  ORDER BY search_count DESC
  LIMIT result_limit;
$$;

-- 6. RLS: search_log is insert-only from anon/authenticated,
--    but we use service_role (adminClient) so no RLS needed.
--    Enable RLS but grant no policies — only service_role bypasses.
ALTER TABLE search_log ENABLE ROW LEVEL SECURITY;
