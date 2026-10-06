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
