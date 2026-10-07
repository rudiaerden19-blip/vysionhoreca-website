-- Klantscherm promo-video’s (mp4 tot ~500 MB in de app).
-- Eénmalig in Supabase → SQL Editor (anders blijft upload op 0% of faalt stilletjes).

UPDATE storage.buckets
SET file_size_limit = 524288000
WHERE id = 'media';

-- Controle (moet 524288000 tonen):
-- SELECT id, file_size_limit FROM storage.buckets WHERE id = 'media';
