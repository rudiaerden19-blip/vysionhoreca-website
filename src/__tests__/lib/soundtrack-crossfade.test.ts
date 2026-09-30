import {
  VYSION_MUSIC_CROSSFADE_SECONDS,
  soundtrackCrossfadeSettingsMatch,
} from '@/lib/soundtrack/soundtrack-server'

describe('soundtrack crossfade settings', () => {
  it('uses 3 second default', () => {
    expect(VYSION_MUSIC_CROSSFADE_SECONDS).toBe(3)
  })

  it('matches when zone has 3s crossfade enabled', () => {
    expect(
      soundtrackCrossfadeSettingsMatch({
        crossfade: true,
        crossfadeLength: 3,
        crossfadeOnSkip: true,
      }),
    ).toBe(true)
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
        crossfadeLength: 3,
        crossfadeOnSkip: false,
      }),
    ).toBe(false)
  })
})
