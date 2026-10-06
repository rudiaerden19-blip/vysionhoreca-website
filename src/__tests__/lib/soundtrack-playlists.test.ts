import {
  createSoundtrackLibraryPlaylist,
  listSoundtrackLibraryPlaylists,
  type SoundtrackGql,
} from '@/lib/soundtrack/soundtrack-playlists'

const ZONE = 'zone-1'
const ACCOUNT = 'account-1'
const LIBRARY = 'library-1'

function libraryPayload(playlists: { id: string; name: string; total: number }[]) {
  return {
    soundZone: {
      account: {
        id: ACCOUNT,
        musicLibrary: {
          id: LIBRARY,
          playlists: {
            edges: playlists.map((p) => ({
              node: { id: p.id, name: p.name, tracks: { total: p.total } },
            })),
          },
        },
      },
    },
  }
}

describe('soundtrack library playlists', () => {
  it('lists playlists from the zone account music library', async () => {
    const calls: { query: string; variables?: Record<string, unknown> }[] = []
    const gql: SoundtrackGql = async <T,>(query: string, variables?: Record<string, unknown>) => {
      calls.push({ query, variables })
      return libraryPayload([
        { id: 'b', name: 'Zomer', total: 4 },
        { id: 'a', name: 'Avond', total: 2 },
      ]) as T
    }

    const rows = await listSoundtrackLibraryPlaylists(ZONE, gql)

    expect(calls).toHaveLength(1)
    expect(calls[0].query).toContain('soundZone(id: $id)')
    expect(calls[0].query).toContain('playlists(first: 100, orderBy: { direction: ASC })')
    expect(calls[0].query).toContain('tracks { total }')
    expect(calls[0].query).not.toContain('album')
    expect(calls[0].variables).toEqual({ id: ZONE })
    expect(rows.map((r) => r.name)).toEqual(['Avond', 'Zomer'])
    expect(rows[0]).toEqual({ id: 'a', name: 'Avond', trackCount: 2 })
  })

  it('creates a manual playlist and adds it to the music library', async () => {
    const calls: { query: string; variables?: Record<string, unknown> }[] = []
    const gql: SoundtrackGql = async <T,>(query: string, variables?: Record<string, unknown>) => {
      calls.push({ query, variables })
      if (query.includes('soundZone')) return libraryPayload([]) as T
      if (query.includes('createManualPlaylist')) {
        return { createManualPlaylist: { id: 'pl-new', name: 'Zaal' } } as T
      }
      if (query.includes('addToMusicLibrary')) {
        return { addToMusicLibrary: { musicLibrary: { id: LIBRARY } } } as T
      }
      throw new Error(`unexpected query: ${query}`)
    }

    const created = await createSoundtrackLibraryPlaylist(ZONE, '  Zaal  ', gql)

    expect(created).toEqual({ id: 'pl-new', name: 'Zaal', trackCount: 0 })
    expect(calls).toHaveLength(3)
    expect(calls[1].query).toContain('mutation($input: CreateManualPlaylistInput!)')
    expect(calls[1].variables).toEqual({
      input: { ownerId: ACCOUNT, name: 'Zaal', playbackMode: 'linear' },
    })
    expect(calls[2].query).toContain('mutation($input: AddToMusicLibraryInput!)')
    expect(calls[2].variables).toEqual({
      input: { parent: LIBRARY, source: 'pl-new' },
    })
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
