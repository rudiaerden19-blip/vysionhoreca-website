/**
 * Eenmalige debug-run (lokaal): npm test -- --testPathPatterns=soundtrack-queue-tracks-debug.integration
 * Vereist SOUNDTRACK_API_BASIC + tenant slug in SOUNDTRACK_DEBUG_TENANT_SLUG (of SOUNDTRACK_DEFAULT_ZONE_NAME).
 */
import { soundtrackDebugSoundZoneQueueTracks } from '@/lib/soundtrack/soundtrack-public-mutations'
import {
  fetchSoundtrackPlayerSnapshot,
  resolveSoundZoneForTenant,
  soundtrackSearchTracks,
} from '@/lib/soundtrack/soundtrack-server'

const hasToken = Boolean(process.env.SOUNDTRACK_API_BASIC?.trim())
const tenant =
  (process.env.SOUNDTRACK_DEBUG_TENANT_SLUG || process.env.SOUNDTRACK_DEFAULT_ZONE_NAME || '').trim()
const searchQ = (process.env.SOUNDTRACK_DEBUG_SEARCH_Q || 'love').trim()

;(hasToken && tenant ? describe : describe.skip)('soundZoneQueueTracks debug integration', () => {
  it('reports GraphQL request/response and snapshot after queue (no play)', async () => {
    const { zoneId } = await resolveSoundZoneForTenant(tenant)
    const before = await fetchSoundtrackPlayerSnapshot(zoneId)

    const tracks = await soundtrackSearchTracks(searchQ, { maxResults: 5 })
    expect(tracks.length).toBeGreaterThan(0)
    const trackId = tracks[0]!.id

    const { variables, raw } = await soundtrackDebugSoundZoneQueueTracks(zoneId, {
      tracks: [trackId],
      immediate: true,
      clearQueuedTracks: true,
    })

    const after = await fetchSoundtrackPlayerSnapshot(zoneId)

    const report = {
      A_graphqlRequest: {
        mutation: 'soundZoneQueueTracks',
        variables,
      },
      B_graphqlResponse: raw.body,
      C_graphqlErrors: raw.body.errors ?? null,
      D_zoneIdBeforeMutation: zoneId,
      E_trackIdFromSearch: trackId,
      F_snapshotAfterMutation: {
        zoneId: after.zoneId,
        online: after.online,
        isPaired: after.isPaired,
        playbackState: after.playbackState,
        nowPlayingTrackId: after.nowPlaying.track?.id ?? null,
        nowPlayingTitle: after.nowPlaying.track?.name ?? null,
      },
      snapshotBefore: {
        nowPlayingTrackId: before.nowPlaying.track?.id ?? null,
        playbackState: before.playbackState,
      },
      httpStatus: raw.httpStatus,
    }

    // eslint-disable-next-line no-console -- debug output for operator
    console.log('\n=== soundZoneQueueTracks DEBUG REPORT ===\n', JSON.stringify(report, null, 2))
  }, 60_000)
})
