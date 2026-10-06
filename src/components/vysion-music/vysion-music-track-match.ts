import type { VysionMusicCatalogTrack } from './vysion-music-catalog-cache'

export type VysionMusicNowPlayingMatch = {
  id: string
  name: string
  artist: string
}

/** Actieve catalogusrij: alleen exact Soundtrack `nowPlaying.track.id`. */
export function vysionMusicTrackRowIsNowPlaying(
  row: VysionMusicCatalogTrack,
  now: VysionMusicNowPlayingMatch | null,
): boolean {
  if (!now?.id?.trim()) return false
  return row.id.trim() === now.id.trim()
}
