import {
  VYSION_MUSIC_CROSSFADE_SECONDS,
  soundtrackCrossfadeLengthToSeconds,
  soundtrackCrossfadeSettingsMatch,
} from '@/lib/soundtrack/soundtrack-server'

describe('soundtrack crossfade settings', () => {
  it('uses 6 second default', () => {
    expect(VYSION_MUSIC_CROSSFADE_SECONDS).toBe(6)
  })

  it('matches when zone has 6s crossfade enabled', () => {
    expect(
      soundtrackCrossfadeSettingsMatch({
        crossfade: true,
        crossfadeLength: 6,
        crossfadeOnSkip: true,
      }),
    ).toBe(true)
  })

  it('normalizes millisecond crossfade length from API', () => {
    expect(soundtrackCrossfadeLengthToSeconds(6000)).toBe(6)
    expect(soundtrackCrossfadeLengthToSeconds(6)).toBe(6)
  })

  it('does not match wrong length or disabled skip crossfade', () => {
    expect(
      soundtrackCrossfadeSettingsMatch({
        crossfade: true,
        crossfadeLength: 5,
        crossfadeOnSkip: true,
      }),
    ).toBe(false)
    expect(
      soundtrackCrossfadeSettingsMatch({
        crossfade: true,
        crossfadeLength: 6,
        crossfadeOnSkip: false,
      }),
    ).toBe(false)
  })
})
