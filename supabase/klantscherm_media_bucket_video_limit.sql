-- Klantscherm promo-video’s (mp4 tot ~500 MB) in bucket `media`.
-- Eénmalig in Supabase → SQL Editor als upload faalt met "mime type video/mp4 is not supported".

UPDATE storage.buckets
SET
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ]::text[]
WHERE id = 'media';

-- Controle:
-- SELECT id, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'media';
