-- Koppeling Vysion-afspeellijst ↔ Soundtrack manual playlist (zichtbaar in Soundtrack-player).

ALTER TABLE public.vysion_music_playlists
  ADD COLUMN IF NOT EXISTS soundtrack_playlist_id TEXT;

COMMENT ON COLUMN public.vysion_music_playlists.soundtrack_playlist_id IS
  'GraphQL playlist id in Soundtrack (manual playlist in account music library).';
