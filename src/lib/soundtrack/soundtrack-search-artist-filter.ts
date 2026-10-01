/** Korte zoekterm → artiest verwacht (U2, Elvis, …), geen brede track-mix. */
export function prefersArtistOnlySearchResults(query: string): boolean {
  const q = query.trim()
  if (q.length < 2 || q.length > 50) return false
  return q.split(/\s+/).filter(Boolean).length <= 4
}

/** Track hoort bij zoekterm als artiest (bv. «elvis» → Elvis Presley, «u2» → U2). */
export function trackArtistMatchesQuery(artist: string, query: string): boolean {
  const a = artist.trim().toLowerCase()
  const q = query.trim().toLowerCase()
  if (!a || !q) return false
  /* K3, U2: geen brede regex op korte codes — voorkomt rare Soundtrack-treffers. */
  if (q.length <= 3) {
    if (a === q) return true
    if (a.startsWith(`${q} `)) return true
    if (a.startsWith(`${q}&`) || a.startsWith(`${q}(`)) return true
    if (a.startsWith(q)) {
      const next = a.charAt(q.length)
      if (!next || !/[a-z0-9]/i.test(next)) return true
    }
    return false
  }
  if (a === q) return true
  if (a.startsWith(`${q} `)) return true
  if (a.startsWith(q)) {
    const next = a.charAt(q.length)
    if (!next || next === ' ' || next === '&' || next === '(') return true
  }
  const qWords = q.split(/\s+/).filter(Boolean)
  const aWords = a.split(/\s+/).filter(Boolean)
  if (qWords.length === 1 && aWords[0] === qWords[0]) return true
  if (qWords.length > 1 && a.startsWith(q)) return true
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[\\s(&])${escaped}($|[\\s)&.,])`, 'i').test(artist)
}

export function filterTracksByArtistQuery<T extends { artist: string }>(
  rows: T[],
  query: string,
): T[] {
  const q = query.trim()
  if (!q) return rows
  return rows.filter((r) => trackArtistMatchesQuery(r.artist, q))
}

/** Als er treffers op artiest zijn: alleen die tonen (geen andere artiesten bovenaan). */
export function pickArtistScopedSearchResults<T extends { artist: string }>(
  rows: T[],
  query: string,
): T[] | null {
  const scoped = filterTracksByArtistQuery(rows, query)
  return scoped.length > 0 ? scoped : null
}

export function trackArtistNamesMatchQuery(
  artistNames: string[] | undefined | null,
  query: string,
): boolean {
  if (!artistNames?.length) return false
  return artistNames.some((name) => trackArtistMatchesQuery(name, query))
}

/** Extra Soundtrack-zoekstrings om artiest-catalogus te raken. */
export function artistDiscoverySearchQueries(query: string): string[] {
  const q = query.trim()
  if (!q) return []
  const seen = new Set<string>()
  const out: string[] = []
  const add = (s: string) => {
    const t = s.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }
  add(q)
  add(q.toUpperCase())
  if (q.length >= 2) {
    add(q.charAt(0).toUpperCase() + q.slice(1).toLowerCase())
  }
  add(`"${q}"`)
  add(`"${q.toUpperCase()}"`)
  return out
}

/** Snelle eerste paint — max 2 parallelle Soundtrack-calls (geen 6×). */
export function artistQuickDiscoverySearchQueries(query: string): string[] {
  const q = query.trim()
  if (!q) return []
  const out: string[] = [q]
  if (q.length >= 2) {
    const titled = q.charAt(0).toUpperCase() + q.slice(1).toLowerCase()
    if (titled !== q) out.push(titled)
  }
  const upper = q.toUpperCase()
  if (upper !== q && !out.includes(upper)) out.push(upper)
  return out.slice(0, 2)
}
