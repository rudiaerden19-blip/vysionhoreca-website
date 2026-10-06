import {
  createSoundtrackLibraryPlaylist,
  listSoundtrackLibraryPlaylists,
  type SoundtrackGql,
} from '@/lib/soundtrack/soundtrack-playlists'

const ZONE = 'zone-1'
const ACCOUNT = 'account-1'
const LIBRARY = 'library-1'

function zoneAccountPayload() {
  return {
    soundZone: {
      account: {
        id: ACCOUNT,
        musicLibrary: { id: LIBRARY },
      },
    },
  }
}

function childrenPayload(
  nodes: { id: string; name: string; __typename: string }[],
) {
  return {
    musicLibrary: {
      id: LIBRARY,
      children: {
        edges: nodes.map((n) => ({ node: n })),
      },
    },
  }
}

describe('soundtrack library playlists', () => {
  it('lists library children (playlists + soundtracks) from Soundtrack musicLibrary', async () => {
    const calls: { query: string; variables?: Record<string, unknown> }[] = []
    const gql: SoundtrackGql = async <T,>(query: string, variables?: Record<string, unknown>) => {
      calls.push({ query, variables })
      if (query.includes('soundZone')) return zoneAccountPayload() as T
      if (query.includes('children(first: 200)')) {
        return childrenPayload([
          { id: 'st-1', name: 'Modern Jazz', __typename: 'Soundtrack' },
          { id: 'pl-1', name: 'AFSPEELLIJST', __typename: 'Playlist' },
        ]) as T
      }
      throw new Error(`unexpected query: ${query}`)
    }

    const rows = await listSoundtrackLibraryPlaylists(ZONE, gql)

    expect(calls.some((c) => c.query.includes('children(first: 200)'))).toBe(true)
    expect(rows.map((r) => r.name)).toEqual(['AFSPEELLIJST', 'Modern Jazz'])
    expect(rows.find((r) => r.id === 'st-1')?.sourceKind).toBe('soundtrack')
    expect(rows.find((r) => r.id === 'pl-1')?.sourceKind).toBe('playlist')
  })

  it('creates a manual playlist and adds it to the music library', async () => {
    const calls: { query: string; variables?: Record<string, unknown> }[] = []
    const gql: SoundtrackGql = async <T,>(query: string, variables?: Record<string, unknown>) => {
      calls.push({ query, variables })
      if (query.includes('soundZone')) return zoneAccountPayload() as T
      if (query.includes('children(first: 200)')) return childrenPayload([]) as T
      if (query.includes('playlists(first: 200)')) {
        return { musicLibrary: { id: LIBRARY, playlists: { edges: [] } } } as T
      }
      if (query.includes('createManualPlaylist')) {
        return { createManualPlaylist: { id: 'pl-new', name: 'Zaal' } } as T
      }
      if (query.includes('addToMusicLibrary')) {
        return { addToMusicLibrary: { musicLibrary: { id: LIBRARY } } } as T
      }
      throw new Error(`unexpected query: ${query}`)
    }

    const created = await createSoundtrackLibraryPlaylist(ZONE, '  Zaal  ', gql)

    expect(created).toEqual({
      id: 'pl-new',
      name: 'Zaal',
      trackCount: 0,
      sourceKind: 'playlist',
    })
    expect(calls.some((c) => c.query.includes('createManualPlaylist'))).toBe(true)
  })

  it('rejects an empty playlist name before calling Soundtrack', async () => {
    const gql: SoundtrackGql = async <T,>(): Promise<T> => {
      throw new Error('should not call')
    }
    await expect(createSoundtrackLibraryPlaylist(ZONE, '   ', gql)).rejects.toThrow(
      'playlist name required',
    )
  })
})
