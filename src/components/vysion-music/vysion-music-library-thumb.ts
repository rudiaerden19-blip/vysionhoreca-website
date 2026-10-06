import { vysionMusicLibraryFallbackCoverPath } from '@/lib/vysion-music/vysion-music-library-fallback-cover'
import { pickSoundtrackLibraryListArtUrl } from '@/lib/soundtrack/soundtrack-library-list-art'

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

/** Lokale gegenereerde cover wanneer Soundtrack geen lijst-art stuurt. */
export function vysionMusicLibraryFallbackCoverSrc(playlistName: string): string {
  return vysionMusicLibraryFallbackCoverPath(playlistName)
}

export type VysionMusicLibraryListArtSourceKind =
  | 'playlist'
  | 'soundtrack'
  | 'schedule'
  | 'unknown'

/**
 * Track-art eerst; anders echte display.image (na server-enrich).
 * Manual playlists: nooit generiek Soundtrack-noten-icoon — letter tot echte art.
 */
export function vysionMusicLibraryListArtUrl(
  sourceKind: VysionMusicLibraryListArtSourceKind,
  displayImageUrl: string | null | undefined,
  cachedTrackArtUrl: string | null | undefined,
): string | null {
  const manual = sourceKind === 'playlist' || sourceKind === 'unknown'
  if (manual) {
    const fromCache = pickSoundtrackLibraryListArtUrl(null, cachedTrackArtUrl)
    if (fromCache) return fromCache
    return pickSoundtrackLibraryListArtUrl(displayImageUrl, null)
  }
  return pickSoundtrackLibraryListArtUrl(displayImageUrl, cachedTrackArtUrl)
}
