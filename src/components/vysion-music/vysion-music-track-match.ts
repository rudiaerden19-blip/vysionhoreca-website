import type { VysionMusicCatalogTrack } from './vysion-music-catalog-cache'

export type VysionMusicNowPlayingMatch = {
  id: string
  name: string
  artist: string
}

function normTrackText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Match catalogrij op track-id, of titel+artiest (Soundtrack kan zelfde song andere id geven). */
export function vysionMusicTrackRowIsNowPlaying(
  row: VysionMusicCatalogTrack,
  now: VysionMusicNowPlayingMatch | null,
): boolean {
  if (!now?.id) return false
  if (row.id === now.id) return true
  return (
    normTrackText(row.name) === normTrackText(now.name) &&
    normTrackText(row.artist) === normTrackText(now.artist)
  )
}
