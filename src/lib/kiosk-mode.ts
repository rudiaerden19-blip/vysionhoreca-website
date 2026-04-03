/**
 * Tafelkiosk / vaste besteltablet: ?kiosk=1 slaat marketing-landingspagina over (middleware → /menu).
 */
export const KIOSK_QUERY_KEY = 'kiosk' as const

export function parseKioskFlag(value: string | null): boolean {
  if (value == null) return false
  const v = value.toLowerCase().trim()
  return v === '1' || v === 'true' || v === 'yes'
}

/** Voegt ?kiosk=1 of &kiosk=1 toe wanneer kiosk-modus actief is (querystring elders op het pad blijft behouden). */
export function withKioskQuery(path: string, kiosk: boolean): string {
  if (!kiosk) return path
  return path.includes('?') ? `${path}&${KIOSK_QUERY_KEY}=1` : `${path}?${KIOSK_QUERY_KEY}=1`
}
