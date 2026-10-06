/** Zelfde vensternaam als eerdere kassa-integratie — hergebruik Soundtrack-tab. */
export const VYSION_SOUNDTRACK_PLAYER_WINDOW = 'vysion-soundtrack-web-player'

export type ReloadSoundtrackPlayerResult = 'reloaded' | 'opened' | 'failed'

/**
 * F5-equivalent voor het Soundtrack-venster dat Vysion opende (niet voor willekeurige tabs).
 * `location.reload()` op cross-origin popup werkt als dat venster nog open is.
 */
export function reloadSoundtrackPlayerWindow(displayUrl: string | null | undefined): ReloadSoundtrackPlayerResult {
  if (typeof window === 'undefined') return 'failed'

  const name = VYSION_SOUNDTRACK_PLAYER_WINDOW
  let target: Window | null = null
  try {
    target = window.open('', name)
  } catch {
    target = null
  }

  if (target && !target.closed) {
    try {
      target.location.reload()
      return 'reloaded'
    } catch {
      /* cross-origin or blocked — try (re)open with URL */
    }
  }

  const url = displayUrl?.trim()
  if (!url) return 'failed'

  window.open(url, name, 'noopener')
  return 'opened'
}
