/** Algemene zoek-dedupe: één rij per genormaliseerde titel + artiest (eerste behouden). */

export type SoundtrackSearchDedupeRow = {
  id: string
  name: string
  artist: string
}

export function normalizeSearchTitleArtist(title: string, artist: string): { title: string; artist: string } {
  return {
    title: title.trim().toLowerCase().replace(/\s+/g, ' '),
    artist: artist.trim().toLowerCase().replace(/\s+/g, ' '),
  }
}

export function searchTrackTitleArtistKey(row: SoundtrackSearchDedupeRow): string {
  const { title, artist } = normalizeSearchTitleArtist(row.name, row.artist)
  if (!title && !artist) return ''
  return `${title}\u0000${artist}`
}

export function dedupeSearchTrackRows<T extends SoundtrackSearchDedupeRow>(rows: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const row of rows) {
    const key = searchTrackTitleArtistKey(row)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}
