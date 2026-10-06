export function soundtrackArtworkIdFromUrl(url: string | null | undefined): string | null {
  const u = url?.trim()
  if (!u) return null
  const m = u.match(/soundtrack:artwork:([^/?#]+)/i)
  return m?.[1]?.trim() || null
}

/** Soundtrack lege-playlist / lijst-icoon — geen echte hoes. */
export function isSoundtrackGenericLibraryArtUrl(url: string | null | undefined): boolean {
  const u = url?.trim().toLowerCase()
  if (!u || !u.startsWith('http')) return true
  if (u.includes('placeholder')) return true
  if (u.includes('generic')) return true
  if (u.includes('default') && (u.includes('playlist') || u.includes('library'))) return true
  const artworkId = soundtrackArtworkIdFromUrl(u)?.toLowerCase()
  if (artworkId) {
    if (artworkId.includes('placeholder')) return true
    if (artworkId.includes('default')) return true
    if (artworkId.includes('empty')) return true
  }
  if (!u.includes('soundtrack:artwork:')) return true
  return false
}

/** Zelfde Soundtrack-asset op meerdere lijsten = generiek noten-icoon, geen echte hoes. */
export function nullSharedSoundtrackPlaceholderListArt<T extends { imageUrl: string | null }>(
  rows: T[],
): T[] {
  const countByArtwork = new Map<string, number>()
  for (const row of rows) {
    const aid = soundtrackArtworkIdFromUrl(row.imageUrl)
    if (!aid) continue
    countByArtwork.set(aid, (countByArtwork.get(aid) ?? 0) + 1)
  }
  const shared = new Set<string>()
  for (const [aid, n] of countByArtwork) {
    if (n >= 2) shared.add(aid)
  }
  if (!shared.size) return rows
  return rows.map((row) => {
    const aid = soundtrackArtworkIdFromUrl(row.imageUrl)
    if (aid && shared.has(aid)) return { ...row, imageUrl: null }
    return row
  })
}

/** Eerste track-art, anders echte display.image — nooit generiek icoon. */
export function pickSoundtrackLibraryListArtUrl(
  displayImageUrl: string | null | undefined,
  trackArtUrl: string | null | undefined,
): string | null {
  const track = trackArtUrl?.trim()
  if (track?.startsWith('http') && !isSoundtrackGenericLibraryArtUrl(track)) return track

  const display = displayImageUrl?.trim()
  if (display?.startsWith('http') && !isSoundtrackGenericLibraryArtUrl(display)) return display

  return null
}
