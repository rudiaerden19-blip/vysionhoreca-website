import {
  buildSoundtrackWebPlayerRefreshUrl,
  VYSION_SOUNDTRACK_WEB_PLAYER_WINDOW,
} from '@/lib/vysion-music/soundtrack-web-player-refresh'

describe('soundtrack web player refresh', () => {
  it('appends cache buster to display URL', () => {
    const out = buildSoundtrackWebPlayerRefreshUrl('https://play.example/zone/1', 123)
    expect(out).toBe('https://play.example/zone/1?vysion_refresh=123')
    expect(buildSoundtrackWebPlayerRefreshUrl('https://x.com/a?foo=1', 5)).toBe(
      'https://x.com/a?foo=1&vysion_refresh=5',
    )
  })

  it('exports stable window name for kassa', () => {
    expect(VYSION_SOUNDTRACK_WEB_PLAYER_WINDOW).toBe('vysion-soundtrack-web-player')
  })
})
