/**
 * Contract uit Soundtrack Public API v2 (GraphQL introspectie, geen auth):
 * AddToMusicLibraryInput.parent — "Currently the only supported parent kind is `Account`."
 */
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

describe('Soundtrack addToMusicLibrary parent contract', () => {
  beforeEach(() => {
    graphql.mockReset()
  })

  it('sends Account id as parent, never musicLibrary.id', async () => {
    graphql.mockImplementation(async (query: string) => {
      if (query.includes('soundZone')) {
        return {
          soundZone: {
            id: 'zone-1',
            name: 'Z',
            isPaired: true,
            online: true,
            account: {
              id: 'acc-real',
              library: { ids: [], version: '1' },
              musicLibrary: { id: 'ml-different-id', ids: ['pl-x'], revision: '1' },
            },
          },
        }
      }
      if (query.includes('createManualPlaylist')) {
        return { createManualPlaylist: { id: 'pl-x', name: 'X' } }
      }
      if (query.includes('library(owner') && !query.includes('account')) {
        return { library: { version: '1' } }
      }
      if (query.includes('addToLibrary')) {
        return { addToLibrary: { version: '2' } }
      }
      if (query.includes('addToMusicLibrary')) {
        return { addToMusicLibrary: { musicLibrary: { ids: ['pl-x'], revision: '2' } } }
      }
      if (query.includes('playlist(id')) {
        return { playlist: { id: 'pl-x', name: 'X' } }
      }
      throw new Error(`unexpected: ${query.slice(0, 80)}`)
    })

    await createManualPlaylistInMusicLibrary('zone-1', 'X')

    const add = graphql.mock.calls.find(([q]) => String(q).includes('addToMusicLibrary'))
    expect(add?.[1]).toEqual({ input: { parent: 'acc-real', source: 'pl-x' } })
    expect((add?.[1] as { input: { parent: string } }).input.parent).not.toBe('ml-different-id')
  })
})
