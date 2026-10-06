import {
  soundtrackSearchTracks,
  type SoundtrackTrackRow,
} from '@/lib/soundtrack/soundtrack-server'

function normalizeTitle(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
}

function titlesMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  return false
}

function artistMatches(spotifyArtists: string[], soundtrackArtist: string): boolean {
  const sa = soundtrackArtist.trim().toLowerCase()
  if (!sa) return false
  return spotifyArtists.some((a) => {
    const x = a.trim().toLowerCase()
    if (!x) return false
    if (x === sa) return true
    if (sa.startsWith(x) || x.startsWith(sa)) return true
    return false
  })
}

/** Eerste sterke treffer in Soundtrack catalogus (zelfde idee als Soundtrack Spotify-import). */
export async function matchSpotifyTrackToSoundtrack(
  name: string,
  artists: string[],
): Promise<SoundtrackTrackRow | null> {
  const primaryArtist = artists[0]?.trim() || ''
  const queries: string[] = []
  if (primaryArtist) queries.push(`${name} ${primaryArtist}`)
  queries.push(name)
  if (primaryArtist) queries.push(`${primaryArtist} ${name}`)

  const seenQ = new Set<string>()
  let candidates: SoundtrackTrackRow[] = []

  for (const q of queries) {
    const t = q.trim()
    if (!t || seenQ.has(t)) continue
    seenQ.add(t)
    const batch = await soundtrackSearchTracks(t, {
      maxResults: 12,
      artistSearchMode: 'quick',
    })
    candidates = candidates.concat(batch)
  }

  const dedup = new Map<string, SoundtrackTrackRow>()
  for (const row of candidates) {
    if (!dedup.has(row.id)) dedup.set(row.id, row)
  }
  const list = [...dedup.values()]

  const exactTitle = list.filter((r) => titlesMatch(r.name, name))
  if (exactTitle.length) {
    const withArtist = exactTitle.find((r) => artistMatches(artists, r.artist))
    return withArtist ?? exactTitle[0] ?? null
  }

  return null
}
