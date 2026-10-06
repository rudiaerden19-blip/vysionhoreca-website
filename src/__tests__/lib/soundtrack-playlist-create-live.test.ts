import {
  createManualPlaylistInMusicLibrary,
  findSoundtrackMusicLibraryPlaylistByName,
  resolveSoundtrackZoneLibraryContext,
} from '@/lib/soundtrack/soundtrack-playlists'
import { soundtrackApiBasicToken } from '@/lib/soundtrack/soundtrack-api-basic'

const LIVE = process.env.SOUNDTRACK_PLAYLIST_LIVE_TEST === '1'
const ZONE_ID = (process.env.SOUNDTRACK_DEFAULT_SOUND_ZONE_ID || '').trim()
const TEST_NAME = (process.env.SOUNDTRACK_PLAYLIST_TEST_NAME || 'VYSION-API-TEST').trim()

function canRunLive(): boolean {
  if (!LIVE || !ZONE_ID) return false
  try {
    soundtrackApiBasicToken()
    return true
  } catch {
    return false
  }
}

const describeLive = canRunLive() ? describe : describe.skip

describeLive('Soundtrack live playlist create (acceptance)', () => {
  jest.setTimeout(120_000)

  it('creates VYSION-API-TEST in Soundtrack music library', async () => {
    const uniqueName = `${TEST_NAME}-${Date.now()}`
    const created = await createManualPlaylistInMusicLibrary(ZONE_ID, uniqueName)
    expect(created.id).toBeTruthy()

    const { musicLibraryId } = await resolveSoundtrackZoneLibraryContext(ZONE_ID)
    const found = await findSoundtrackMusicLibraryPlaylistByName(musicLibraryId, uniqueName)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(created.id)
    expect(found!.name).toBe(uniqueName)
  })
})
