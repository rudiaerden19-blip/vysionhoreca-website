/** Zelfde fallback-letter als lege playlists in de bibliotheeklijst (geen leeg thumb-vak). */
export function vysionMusicLibraryPlaceholderLetter(name: string): string {
  const ch = name.trim().charAt(0)
  return ch ? ch.toUpperCase() : '♪'
}

/** Alleen echte http(s) cover-URL's; anders placeholder in UI. */
export function vysionMusicLibraryCoverProxyUrl(imageUrl: string | null | undefined): string | null {
  const url = imageUrl?.trim()
  if (!url || !url.startsWith('http')) return null
  return `/api/soundtrack/cover?url=${encodeURIComponent(url)}`
}

export type VysionMusicLibraryListArtSourceKind =
  | 'playlist'
  | 'soundtrack'
  | 'schedule'
  | 'unknown'

/**
 * Manual playlists: geen Soundtrack default-icoon uit display.image — letter-placeholder
 * tot er echte track-art is. Stations/schedules: display.image blijft leidend.
 */
export function vysionMusicLibraryListArtUrl(
  sourceKind: VysionMusicLibraryListArtSourceKind,
  displayImageUrl: string | null | undefined,
  cachedTrackArtUrl: string | null | undefined,
): string | null {
  const track = cachedTrackArtUrl?.trim()
  const display = displayImageUrl?.trim()
  const manual = sourceKind === 'playlist' || sourceKind === 'unknown'
  if (manual) {
    return track && track.startsWith('http') ? track : null
  }
  if (display?.startsWith('http')) return display
  return track && track.startsWith('http') ? track : null
}
