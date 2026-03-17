-- ============================================================
-- Klickenya — 004_search_blog_posts.sql
-- Full-text search function for blog posts.
-- ============================================================

CREATE OR REPLACE FUNCTION search_blog_posts(
  query text
) RETURNS SETOF blog_posts AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM blog_posts
  WHERE
    search_vector @@ plainto_tsquery('english', query)
    AND status = 'published'
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', query)) DESC;
END;
$$ LANGUAGE plpgsql;
