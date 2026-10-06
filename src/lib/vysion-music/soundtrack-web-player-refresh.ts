/** Vaste vensternaam: Soundtrack-web op kassa (zelfde tab hergebruiken). */
export const VYSION_SOUNDTRACK_WEB_PLAYER_WINDOW = 'vysion-soundtrack-web-player'

export function buildSoundtrackWebPlayerRefreshUrl(baseUrl: string, cacheBustMs = Date.now()): string {
  const base = baseUrl.trim()
  if (!base) return ''
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}vysion_refresh=${cacheBustMs}`
}

/**
 * Herlaadt Soundtrack in de browser op de kassa (officiële zone display-URL).
 * Geen focus — kassa blijft op Vysion; Soundtrack-tab pakt library/sync opnieuw op.
 */
export function refreshSoundtrackWebPlayer(nowPlayingDisplayUrl: string | null | undefined): void {
  if (typeof window === 'undefined') return
  const url = buildSoundtrackWebPlayerRefreshUrl(nowPlayingDisplayUrl ?? '')
  if (!url) return

  const name = VYSION_SOUNDTRACK_WEB_PLAYER_WINDOW
  let w: Window | null = null
  try {
    w = window.open('', name)
  } catch {
    w = null
  }

  if (w && !w.closed) {
    try {
      w.location.href = url
      return
    } catch {
      /* fall through */
    }
  }

  window.open(url, name, 'noopener')
}
