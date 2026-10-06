import { VYSION_SOUNDTRACK_PLAYER_WINDOW } from '@/lib/vysion-music/soundtrack-player-window'

describe('soundtrack player window', () => {
  it('uses stable window name for kassa reuse', () => {
    expect(VYSION_SOUNDTRACK_PLAYER_WINDOW).toBe('vysion-soundtrack-web-player')
  })
})
