import {
  createManualPlaylistInMusicLibrary,
  isBenignSoundtrackLibraryDuplicateError,
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

describe('createManualPlaylistInMusicLibrary player library sync', () => {
  beforeEach(() => {
    graphql.mockReset()
  })

  it('calls addToLibrary before addToMusicLibrary for Soundtrack Player libraryUpdate', async () => {
    graphql.mockImplementation(async (query: string) => {
      if (query.includes('soundZone')) {
        return {
          soundZone: { account: { id: 'acc-1', musicLibrary: { id: 'ml-1' } } },
        }
      }
      if (query.includes('createManualPlaylist')) {
        return { createManualPlaylist: { id: 'pl-1', name: 'Lunch' } }
      }
      if (query.includes('musicLibraryId') && query.includes('library(owner')) {
        return {
          library: { ids: ['pl-1'], version: 'rev-10' },
          musicLibrary: { ids: ['pl-1'], revision: '2' },
        }
      }
      if (query.includes('library(owner') && query.includes('version') && !query.includes('ids')) {
        return { library: { version: 'rev-9' } }
      }
      if (query.includes('addToLibrary')) {
        return { addToLibrary: { version: 'rev-10' } }
      }
      if (query.includes('addToMusicLibrary')) {
        return { addToMusicLibrary: { musicLibrary: { revision: '2', ids: ['pl-1'] } } }
      }
      if (query.includes('playlist(id') && query.includes('tracks(first: 1)')) {
        return { playlist: null }
      }
      throw new Error(`unexpected graphql: ${query.slice(0, 120)}`)
    })

    await createManualPlaylistInMusicLibrary('zone-1', 'Lunch')

    const addToLibraryIdx = graphql.mock.calls.findIndex(([q]) => String(q).includes('addToLibrary'))
    const addToMusicIdx = graphql.mock.calls.findIndex(([q]) =>
      String(q).includes('addToMusicLibrary'),
    )
    expect(addToLibraryIdx).toBeGreaterThan(-1)
    expect(addToMusicIdx).toBeGreaterThan(addToLibraryIdx)

    const addToLibraryCall = graphql.mock.calls[addToLibraryIdx]
    expect(addToLibraryCall[1]).toEqual({
      owner: 'acc-1',
      input: {
        version: 'rev-9',
        items: [{ id: 'pl-1', itemKind: 'PLAYLIST' }],
      },
    })
  })
})

describe('isBenignSoundtrackLibraryDuplicateError', () => {
  it('recognizes duplicate library item errors', () => {
    expect(isBenignSoundtrackLibraryDuplicateError('Item already in library')).toBe(true)
    expect(isBenignSoundtrackLibraryDuplicateError('Forbidden')).toBe(false)
  })
})
