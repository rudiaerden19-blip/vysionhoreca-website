import {
  reloadSoundtrackPlayerWindow,
  resetSoundtrackPlayerWindowRefForTests,
  VYSION_SOUNDTRACK_PLAYER_WINDOW,
} from '@/lib/vysion-music/soundtrack-player-window'

const PLAYER_URL = 'https://player.soundtrackyourbrand.com/z/abc'

describe('soundtrack player window', () => {
  beforeEach(() => {
    resetSoundtrackPlayerWindowRefForTests()
    jest.restoreAllMocks()
  })

  it('uses stable window name for kassa reuse', () => {
    expect(VYSION_SOUNDTRACK_PLAYER_WINDOW).toBe('vysion-soundtrack-web-player')
  })

  it('opens player URL directly (never about:blank)', () => {
    const open = jest.spyOn(window, 'open').mockImplementation((href, name) => {
      expect(href).toBe(PLAYER_URL)
      expect(name).toBe(VYSION_SOUNDTRACK_PLAYER_WINDOW)
      return {
        closed: false,
        focus: jest.fn(),
        location: { href: 'about:blank', reload: jest.fn() },
      } as unknown as Window
    })

    expect(reloadSoundtrackPlayerWindow(PLAYER_URL)).toBe('opened')
    expect(open).toHaveBeenCalledTimes(1)
    expect(open.mock.calls[0]?.[0]).toBe(PLAYER_URL)
  })

  it('reloads cached popup without opening empty target', () => {
    const reload = jest.fn()
    const playerWin = {
      closed: false,
      focus: jest.fn(),
      location: { href: 'about:blank', reload },
    } as unknown as Window

    const open = jest.spyOn(window, 'open').mockReturnValue(playerWin)
    expect(reloadSoundtrackPlayerWindow(PLAYER_URL)).toBe('opened')
    expect(reload).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalledTimes(1)

    expect(reloadSoundtrackPlayerWindow(PLAYER_URL)).toBe('reloaded')
    expect(reload).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('reloads existing cross-origin named window', () => {
    const reload = jest.fn()
    const playerWin = {
      closed: false,
      focus: jest.fn(),
      location: {
        get href() {
          throw new DOMException('Blocked', 'SecurityError')
        },
        reload,
      },
    } as unknown as Window

    jest.spyOn(window, 'open').mockReturnValue(playerWin)

    expect(reloadSoundtrackPlayerWindow(PLAYER_URL)).toBe('reloaded')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('returns failed when display URL is missing or popup blocked', () => {
    const open = jest.spyOn(window, 'open')
    expect(reloadSoundtrackPlayerWindow(null)).toBe('failed')
    expect(reloadSoundtrackPlayerWindow('   ')).toBe('failed')
    expect(open).not.toHaveBeenCalled()

    open.mockReturnValue(null)
    expect(reloadSoundtrackPlayerWindow(PLAYER_URL)).toBe('failed')
  })
})
