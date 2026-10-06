import {
  createManualPlaylistInMusicLibrary,
  removePlaylistFromMusicLibrary,
} from '@/lib/soundtrack/soundtrack-playlists'
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

  it('uses createManualPlaylist and addToMusicLibrary with Account parent', async () => {
    graphql.mockImplementation(async (query: string) => {
      if (query.includes('soundZone')) {
        return {
          soundZone: {
            id: 'zone-1',
            name: 'Test Zone',
            isPaired: true,
            online: true,
            account: {
              id: 'acc-1',
              library: { ids: [], version: 'v2' },
              musicLibrary: { id: 'ml-1', ids: ['pl-test'], revision: '3' },
            },
          },
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
      if (query.includes('account(id') && query.includes('musicLibrary')) {
        return { account: { musicLibrary: { ids: ['pl-test'] } } }
      }
      if (query.includes('playlist(id') && query.includes('name') && !query.includes('playlists')) {
        return { playlist: { id: 'pl-test', name: 'TEST' } }
      }
      throw new Error(`unexpected graphql: ${query.slice(0, 120)}`)
    })

    const out = await createManualPlaylistInMusicLibrary('zone-1', 'TEST')
    expect(out).toEqual({ id: 'pl-test', name: 'TEST' })

    expect(graphql.mock.calls.some(([q]) => String(q).includes('createManualPlaylist'))).toBe(true)
    expect(graphql.mock.calls.filter(([q]) => String(q).includes('addToLibrary')).length).toBe(1)
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

describe('removePlaylistFromMusicLibrary', () => {
  beforeEach(() => {
    graphql.mockReset()
  })

  it('uses removeFromMusicLibrary then removeFromLibrary with itemIds', async () => {
    graphql.mockImplementation(async (query: string) => {
      if (query.includes('soundZone')) {
        return {
          soundZone: {
            id: 'zone-1',
            account: { id: 'acc-1', musicLibrary: { id: 'ml-1' } },
          },
        }
      }
      if (query.includes('removeFromMusicLibrary')) {
        return { removeFromMusicLibrary: { __typename: 'RemoveFromMusicLibraryPayload' } }
      }
      if (query.includes('library(owner') && query.includes('version')) {
        return { library: { version: 'v9' } }
      }
      if (query.includes('removeFromLibrary')) {
        return { removeFromLibrary: { version: 'v10' } }
      }
      throw new Error(`unexpected graphql: ${query.slice(0, 120)}`)
    })

    await removePlaylistFromMusicLibrary('zone-1', 'pl-80s')

    const removeMusicCall = graphql.mock.calls.find(([q]) =>
      String(q).includes('removeFromMusicLibrary'),
    )
    expect(removeMusicCall?.[1]).toEqual({
      input: { parent: 'acc-1', source: 'pl-80s' },
    })

    const removeOwnerCall = graphql.mock.calls.find(([q]) => String(q).includes('removeFromLibrary'))
    expect(removeOwnerCall?.[1]).toEqual({
      owner: 'acc-1',
      input: { version: 'v9', itemIds: ['pl-80s'] },
    })
    expect(removeOwnerCall?.[1]?.input).not.toHaveProperty('items')
  })
})
