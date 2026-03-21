-- Add source column to newsletter_subscribers to track where each subscriber came from
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website';
