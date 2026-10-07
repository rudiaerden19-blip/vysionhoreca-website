-- Publieke READ voor klantscherm promo-objecten (video/foto idle-slideshow).
-- Nodig als security-migraties brede SELECT op storage.media hebben verwijderd.
-- Voer uit in Supabase SQL Editor na klantscherm_promo_video_bucket.sql.

DROP POLICY IF EXISTS klantscherm_promo_public_read ON storage.objects;
CREATE POLICY klantscherm_promo_public_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'klantscherm-promo');

DROP POLICY IF EXISTS klantscherm_media_klantscherm_public_read ON storage.objects;
CREATE POLICY klantscherm_media_klantscherm_public_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'media'
    AND name ~ '/klantscherm/'
  );
