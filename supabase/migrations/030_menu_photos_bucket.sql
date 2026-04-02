-- 030_menu_photos_bucket.sql
-- Create a public storage bucket for menu item photos.

INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-photos', 'menu-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their menu's folder
CREATE POLICY "menu_photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'menu-photos'
  );

-- Allow public read access (menu photos are public)
CREATE POLICY "menu_photos_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'menu-photos');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "menu_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'menu-photos');
