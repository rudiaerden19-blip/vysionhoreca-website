-- Klantscherm promo-mp4 (~500 MB). Eénmalig in Supabase SQL Editor.
-- Daarna: Dashboard → Storage → Settings → «Global file size limit» minstens 500 MB.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'klantscherm-promo',
  'klantscherm-promo',
  true,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Controle:
-- SELECT id, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'klantscherm-promo';
