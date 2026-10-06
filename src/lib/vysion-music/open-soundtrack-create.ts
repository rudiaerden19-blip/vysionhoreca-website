export const VYSION_SOUNDTRACK_PLAYER_WINDOW = 'vysion-soundtrack-web-player'

/** Deep link naar Soundtrack Create (zelfde SPA als nowPlayingDisplayUrl). */
export function soundtrackCreateWebUrl(playerWebUrl: string): string {
  const raw = playerWebUrl.trim()
  if (!raw) return raw
  try {
    const u = new URL(raw)
    const path = u.pathname.replace(/\/$/, '')
    u.pathname = `${path}/create`
    u.hash = ''
    return u.toString()
  } catch {
    return raw
  }
}

export function openSoundtrackWebUrl(webUrl: string | null | undefined): boolean {
  const url = webUrl?.trim()
  if (!url || typeof window === 'undefined') return false
  return Boolean(window.open(url, VYSION_SOUNDTRACK_PLAYER_WINDOW))
}
