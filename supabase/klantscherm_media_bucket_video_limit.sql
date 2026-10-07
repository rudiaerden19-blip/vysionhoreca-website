-- Klantscherm promo-video’s (mp4 tot ~500 MB in de app).
-- Eénmalig in Supabase SQL Editor als uploads > oude bucket-limiet falen.

UPDATE storage.buckets
SET file_size_limit = 524288000
WHERE id = 'media';
