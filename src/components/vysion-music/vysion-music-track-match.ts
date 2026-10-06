import type { VysionMusicCatalogTrack } from './vysion-music-catalog-cache'

export type VysionMusicNowPlayingMatch = {
  id: string
  name: string
  artist: string
}

/**
 * Linker playlist-rij actief (playFrom + EQ): snapshot playFrom én nowPlaying-track hoort bij die playlist.
 * Handmatig gequeue’d zoeknummer (niet in playlist-tracks) → geen playlist actief.
 */
export function vysionMusicPlaylistRowIsActivePlayFrom(
  playlistId: string,
  playFromPlaylistId: string | null,
  nowPlayingTrackId: string | null,
  playlistTrackIds: string[] | null,
): boolean {
  const pf = playFromPlaylistId?.trim()
  const pid = playlistId.trim()
  const nowId = nowPlayingTrackId?.trim()
  if (!pf || pf !== pid || !nowId) return false
  if (playlistTrackIds == null) return true
  return playlistTrackIds.some((id) => id.trim() === nowId)
}

/** Actieve catalogusrij: alleen exact Soundtrack `nowPlaying.track.id`. */
export function vysionMusicTrackRowIsNowPlaying(
  row: VysionMusicCatalogTrack,
  now: VysionMusicNowPlayingMatch | null,
): boolean {
  if (!now?.id?.trim()) return false
  return row.id.trim() === now.id.trim()
}
