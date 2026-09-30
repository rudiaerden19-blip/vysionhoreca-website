import {
  artistDiscoverySearchQueries,
  filterTracksByArtistQuery,
  pickArtistScopedSearchResults,
  prefersArtistOnlySearchResults,
  trackArtistMatchesQuery,
  trackArtistNamesMatchQuery,
} from '@/lib/soundtrack/soundtrack-search-artist-filter'

describe('soundtrack search artist filter', () => {
  const rows = [
    { id: '1', artist: 'Josh Butler', name: 'A' },
    { id: '2', artist: 'U2', name: 'One' },
    { id: '3', artist: 'Elvis Presley', name: 'Love Me' },
    { id: '4', artist: 'Imagine Dragons', name: 'U2 mention' },
  ]

  it('matches U2 and Elvis Presley queries', () => {
    expect(trackArtistMatchesQuery('U2', 'u2')).toBe(true)
    expect(trackArtistMatchesQuery('Elvis Presley', 'elvis')).toBe(true)
    expect(trackArtistMatchesQuery('Josh Butler', 'u2')).toBe(false)
  })

  it('returns only artist-scoped rows when any match', () => {
    const u2 = pickArtistScopedSearchResults(rows, 'U2')
    expect(u2?.map((r) => r.artist)).toEqual(['U2'])
    const elvis = filterTracksByArtistQuery(rows, 'Elvis')
    expect(elvis.map((r) => r.artist)).toEqual(['Elvis Presley'])
  })

  it('returns null when no artist matches (song-title search)', () => {
    expect(pickArtistScopedSearchResults(rows, 'One')).toBeNull()
  })

  it('treats short queries as artist-only search', () => {
    expect(prefersArtistOnlySearchResults('U2')).toBe(true)
    expect(prefersArtistOnlySearchResults('Elvis Presley')).toBe(true)
    expect(prefersArtistOnlySearchResults('a very long song title search phrase')).toBe(false)
  })

  it('matches any credited artist on the track', () => {
    expect(trackArtistNamesMatchQuery(['Josh Butler', 'U2'], 'u2')).toBe(true)
  })

  it('builds discovery query variants', () => {
    const abba = artistDiscoverySearchQueries('Abba')
    expect(abba).toContain('Abba')
    expect(abba).toContain('ABBA')
    expect(abba).toContain('"ABBA"')
  })

  it('matches ABBA artist for abba query', () => {
    expect(trackArtistMatchesQuery('ABBA', 'Abba')).toBe(true)
  })

  it('matches K3 strictly and rejects unrelated K artists', () => {
    expect(trackArtistMatchesQuery('K3', 'K3')).toBe(true)
    expect(trackArtistMatchesQuery('Kaifi Khalil', 'K3')).toBe(false)
    expect(trackArtistMatchesQuery('Kontakt', 'K3')).toBe(false)
  })
})
