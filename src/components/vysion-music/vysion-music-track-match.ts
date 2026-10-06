import type { VysionMusicCatalogTrack } from './vysion-music-catalog-cache'

export type VysionMusicNowPlayingMatch = {
  id: string
  name: string
  artist: string
}

export function vysionMusicTrackMetaKey(name: string, artist: string): string {
  return `${name.trim().toLowerCase()}|${artist.trim().toLowerCase()}`
}

/** Snapshot-track hoort bij playlist (id of titel+artiest in geladen tracklijst). */
export function vysionMusicNowPlayingBelongsToPlaylistTracks(
  now: VysionMusicNowPlayingMatch,
  playlistTrackIds: string[] | null,
  playlistTracks: VysionMusicCatalogTrack[] | null | undefined,
): boolean {
  const nowId = now.id.trim()
  if (playlistTrackIds?.some((id) => id.trim() === nowId)) return true
  if (!playlistTracks?.length) return playlistTrackIds == null
  const nowKey = vysionMusicTrackMetaKey(now.name, now.artist)
  return playlistTracks.some(
    (t) => vysionMusicTrackMetaKey(t.name, t.artist) === nowKey,
  )
}

/**
 * Linker playlist-rij actief (playFrom + EQ): playFrom match én nowPlaying hoort bij die playlist.
 * Zoek-queue (track niet in playlist) blijft uit; volgende lied met ander Soundtrack-id wel via meta-match.
 */
export function vysionMusicPlaylistRowIsActivePlayFrom(
  playlistId: string,
  playFromPlaylistId: string | null,
  nowPlaying: VysionMusicNowPlayingMatch | null,
  playlistTrackIds: string[] | null,
  playlistTracks?: VysionMusicCatalogTrack[] | null,
): boolean {
  const pf = playFromPlaylistId?.trim()
  const pid = playlistId.trim()
  if (!pf || pf !== pid || !nowPlaying?.id?.trim()) return false
  return vysionMusicNowPlayingBelongsToPlaylistTracks(
    nowPlaying,
    playlistTrackIds,
    playlistTracks,
  )
}

/** Actieve catalogusrij: Soundtrack track-id, of titel+artiest in playlistkolom (runtime-id drift). */
export function vysionMusicTrackRowIsNowPlaying(
  row: VysionMusicCatalogTrack,
  now: VysionMusicNowPlayingMatch | null,
  opts?: { allowTitleArtistFallback?: boolean },
): boolean {
  if (!now?.id?.trim()) return false
  if (row.id.trim() === now.id.trim()) return true
  if (!opts?.allowTitleArtistFallback) return false
  return (
    vysionMusicTrackMetaKey(row.name, row.artist) ===
    vysionMusicTrackMetaKey(now.name, now.artist)
  )
}
