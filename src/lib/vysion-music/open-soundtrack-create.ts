/** Officieel Soundtrack Create-scherm (Create your own sound). */
export const SOUNDTRACK_CREATE_WEB_URL = 'https://app.soundtrack.io/create'

export const VYSION_SOUNDTRACK_PLAYER_WINDOW = 'vysion-soundtrack-web-player'

export function openSoundtrackWebUrl(webUrl: string | null | undefined): boolean {
  const url = webUrl?.trim()
  if (!url || typeof window === 'undefined') return false
  return Boolean(window.open(url, VYSION_SOUNDTRACK_PLAYER_WINDOW))
}

export function openSoundtrackCreate(): boolean {
  return openSoundtrackWebUrl(SOUNDTRACK_CREATE_WEB_URL)
}
