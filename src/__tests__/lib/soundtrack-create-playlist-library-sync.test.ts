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

describe('createManualPlaylistInMusicLibrary player library sync', () => {
  beforeEach(() => {
    graphql.mockReset()
  })

  it('calls addToLibrary after addToMusicLibrary so Soundtrack Player gets libraryUpdate', async () => {
    graphql.mockImplementation(async (query: string) => {
      if (query.includes('soundZone')) {
        return { soundZone: { account: { id: 'acc-1', musicLibrary: { id: 'ml-1' } } } }
      }
      if (query.includes('createManualPlaylist')) {
        return { createManualPlaylist: { id: 'pl-1', name: 'Lunch' } }
      }
      if (query.includes('addToMusicLibrary')) {
        return { addToMusicLibrary: { musicLibrary: { revision: '2', ids: ['pl-1'] } } }
      }
      if (query.includes('library(owner')) {
        return { library: { version: 'rev-9' } }
      }
      if (query.includes('addToLibrary')) {
        return { addToLibrary: { version: 'rev-10' } }
      }
      throw new Error(`unexpected graphql: ${query.slice(0, 80)}`)
    })

    await createManualPlaylistInMusicLibrary('zone-1', 'Lunch')

    const addToLibraryCall = graphql.mock.calls.find(([q]) =>
      String(q).includes('addToLibrary'),
    )
    expect(addToLibraryCall).toBeDefined()
    expect(addToLibraryCall![1]).toEqual({
      owner: 'acc-1',
      input: {
        version: 'rev-9',
        items: [{ id: 'pl-1', itemKind: 'PLAYLIST' }],
      },
    })
  })
})
