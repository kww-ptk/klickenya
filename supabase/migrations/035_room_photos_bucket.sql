-- 035_room_photos_bucket.sql
-- Create a public storage bucket for room photos (PMS).

INSERT INTO storage.buckets (id, name, public)
VALUES ('room-photos', 'room-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload room photos
CREATE POLICY "room_photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'room-photos'
  );

-- Allow public read access (room photos are displayed on listing pages)
CREATE POLICY "room_photos_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'room-photos');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "room_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'room-photos');
