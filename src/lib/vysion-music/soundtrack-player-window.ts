/** Zelfde vensternaam als eerdere kassa-integratie — hergebruik Soundtrack-tab. */
export const VYSION_SOUNDTRACK_PLAYER_WINDOW = 'vysion-soundtrack-web-player'

export type ReloadSoundtrackPlayerResult = 'reloaded' | 'opened' | 'failed'

/** Popup-ref in deze Vysion-tab (verloren na F5 op Vysion zelf; vensternaam blijft werken). */
let soundtrackPlayerWindowRef: Window | null = null

function focusAndReload(win: Window): boolean {
  try {
    win.focus()
  } catch {
    /* popup focus kan geblokkeerd zijn */
  }
  try {
    win.location.reload()
    return true
  } catch {
    return false
  }
}

/**
 * F5 voor het Soundtrack-venster `vysion-soundtrack-web-player`.
 * Nooit `window.open('', name)` — dat opent alleen about:blank.
 */
export function reloadSoundtrackPlayerWindow(displayUrl: string | null | undefined): ReloadSoundtrackPlayerResult {
  if (typeof window === 'undefined') return 'failed'

  const url = displayUrl?.trim()
  if (!url) return 'failed'

  const name = VYSION_SOUNDTRACK_PLAYER_WINDOW

  if (soundtrackPlayerWindowRef && !soundtrackPlayerWindowRef.closed) {
    if (focusAndReload(soundtrackPlayerWindowRef)) return 'reloaded'
  }

  const opened = window.open(url, name)
  if (!opened) return 'failed'

  soundtrackPlayerWindowRef = opened

  try {
    const href = opened.location.href
    if (href && href !== 'about:blank' && !href.startsWith('about:')) {
      if (focusAndReload(opened)) return 'reloaded'
    }
    return 'opened'
  } catch {
    // Bestaand cross-origin Soundtrack-venster (zelfde vensternaam) — echte F5
    if (focusAndReload(opened)) return 'reloaded'
    return 'opened'
  }
}

/** Alleen voor tests. */
export function resetSoundtrackPlayerWindowRefForTests(): void {
  soundtrackPlayerWindowRef = null
}
