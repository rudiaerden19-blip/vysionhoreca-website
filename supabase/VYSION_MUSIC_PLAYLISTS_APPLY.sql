-- Eenmalig in Supabase → SQL Editor → Run (productie + eventueel staging).
-- Zelfde als supabase/migrations/20261006130000_vysion_music_playlists.sql

CREATE TABLE IF NOT EXISTS public.vysion_music_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vysion_music_playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  playlist_id UUID NOT NULL REFERENCES public.vysion_music_playlists(id) ON DELETE CASCADE,
  soundtrack_track_id TEXT NOT NULL,
  name TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vysion_music_playlists_tenant
  ON public.vysion_music_playlists (tenant_slug, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_vysion_music_playlist_tracks_playlist
  ON public.vysion_music_playlist_tracks (tenant_slug, playlist_id, sort_order);

ALTER TABLE public.vysion_music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vysion_music_playlist_tracks ENABLE ROW LEVEL SECURITY;
