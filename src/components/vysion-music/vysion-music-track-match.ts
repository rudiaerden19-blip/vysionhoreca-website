import type { VysionMusicCatalogTrack } from './vysion-music-catalog-cache'

export type VysionMusicNowPlayingMatch = {
  id: string
  name: string
  artist: string
}

function normTrackText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function normTrackTitleForMatch(value: string): string {
  let s = normTrackText(value)
  s = s.replace(/\s*\([^)]*remaster[^)]*\)\s*$/i, '')
  s = s.replace(/\s*-\s*remaster(ed)?(\s*\d+)?\s*$/i, '')
  return s.trim()
}

export function normTrackArtistForMatch(value: string): string {
  const s = normTrackText(value)
  const first = s.split(/\s*(?:,|&|\s+and\s+|\s+feat\.?|\s+ft\.?|\s+featuring\s+|\s+with\s+)/i)[0] ?? s
  return first.trim()
}

/** Match catalogrij op track-id, of genormaliseerde titel+artiest (Soundtrack id kan afwijken). */
export function vysionMusicTrackRowIsNowPlaying(
  row: VysionMusicCatalogTrack,
  now: VysionMusicNowPlayingMatch | null,
): boolean {
  if (!now) return false
  const nowId = now.id?.trim()
  const rowId = row.id.trim()
  if (nowId && rowId && rowId === nowId) return true
  if (!now.name?.trim()) return false
  return (
    normTrackTitleForMatch(row.name) === normTrackTitleForMatch(now.name) &&
    normTrackArtistForMatch(row.artist) === normTrackArtistForMatch(now.artist)
  )
}
