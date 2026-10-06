import { createManualPlaylistInMusicLibrary } from '@/lib/soundtrack/soundtrack-playlists'
import { soundtrackGraphql } from '@/lib/soundtrack/soundtrack-server'

jest.mock('@/lib/soundtrack/soundtrack-server', () => {
  const actual = jest.requireActual('@/lib/soundtrack/soundtrack-server')
  return {
    ...actual,
    soundtrackGraphql: jest.fn(),
  }
})

const graphql = soundtrackGraphql as jest.MockedFunction<typeof soundtrackGraphql>

describe('createManualPlaylistInMusicLibrary', () => {
  beforeEach(() => {
    graphql.mockReset()
  })

  it('uses createManualPlaylist, addToLibrary (player) and addToMusicLibrary', async () => {
    graphql.mockImplementation(async (query: string) => {
      if (query.includes('soundZone')) {
        return {
          soundZone: { account: { id: 'acc-1', musicLibrary: { id: 'ml-1' } } },
        }
      }
      if (query.includes('createManualPlaylist')) {
        return { createManualPlaylist: { id: 'pl-test', name: 'TEST' } }
      }
      if (query.includes('library(owner') && query.includes('version') && !query.includes('musicLibrary')) {
        return { library: { version: 'v1' } }
      }
      if (query.includes('addToLibrary')) {
        return { addToLibrary: { version: 'v2' } }
      }
      if (query.includes('addToMusicLibrary')) {
        return { addToMusicLibrary: { musicLibrary: { revision: '3', ids: ['pl-test'] } } }
      }
      if (query.includes('library(owner') && query.includes('musicLibrary(id')) {
        return {
          library: { ids: ['pl-test'], version: 'v2' },
          musicLibrary: { ids: ['pl-test'], revision: '3' },
        }
      }
      if (query.includes('playlist(id') && query.includes('name') && !query.includes('playlists')) {
        return { playlist: { id: 'pl-test', name: 'TEST' } }
      }
      throw new Error(`unexpected graphql: ${query.slice(0, 120)}`)
    })

    const out = await createManualPlaylistInMusicLibrary('zone-1', 'TEST')
    expect(out).toEqual({ id: 'pl-test', name: 'TEST' })

    expect(graphql.mock.calls.some(([q]) => String(q).includes('createManualPlaylist'))).toBe(true)
    const addToLibraryCalls = graphql.mock.calls.filter(([q]) =>
      String(q).includes('addToLibrary'),
    )
    expect(addToLibraryCalls.length).toBe(2)
    const addCall = graphql.mock.calls.find(([q]) => String(q).includes('addToMusicLibrary'))
    expect(addCall?.[1]).toEqual({
      input: { parent: 'acc-1', source: 'pl-test' },
    })
  })

  it('throws when Soundtrack returns no playlist id', async () => {
    graphql.mockImplementation(async (query: string) => {
      if (query.includes('soundZone')) {
        return {
          soundZone: { account: { id: 'acc-1', musicLibrary: { id: 'ml-1' } } },
        }
      }
      if (query.includes('createManualPlaylist')) {
        return { createManualPlaylist: null }
      }
      throw new Error('unexpected')
    })

    await expect(createManualPlaylistInMusicLibrary('zone-1', 'TEST')).rejects.toThrow(
      'Soundtrack created no playlist',
    )
  })
})
