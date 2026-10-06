/**
 * Bevroren contract voor search + playlist track play (e7a1da0d).
 * Wijzig alleen na expliciete playback-goedkeuring + update deze test.
 */
export const VYSION_MUSIC_FROZEN_QUEUE_TRACKS_INPUT = {
  mutation: 'soundZoneQueueTracks' as const,
  shape: {
    tracks: ['<clickedTrackId>'],
    immediate: true,
    clearQueuedTracks: true,
  },
}

describe('Vysion Music playback contract (frozen)', () => {
  it('search uses single-track soundZoneQueueTracks', () => {
    expect(VYSION_MUSIC_FROZEN_QUEUE_TRACKS_INPUT.mutation).toBe('soundZoneQueueTracks')
    expect(VYSION_MUSIC_FROZEN_QUEUE_TRACKS_INPUT.shape.immediate).toBe(true)
    expect(VYSION_MUSIC_FROZEN_QUEUE_TRACKS_INPUT.shape.clearQueuedTracks).toBe(true)
    expect(VYSION_MUSIC_FROZEN_QUEUE_TRACKS_INPUT.shape.tracks).toHaveLength(1)
  })
})
