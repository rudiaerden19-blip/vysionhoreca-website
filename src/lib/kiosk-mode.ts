/**
 * Tafelkiosk: ?kiosk1 (alleen de vlag, geen =1) slaat landingspagina over.
 * Legacy: ?kiosk=1 blijft werken.
 */
export const KIOSK_FLAG_PARAM = 'kiosk1' as const
export const KIOSK_LEGACY_PARAM = 'kiosk' as const

function parseKioskLegacyValue(value: string | null): boolean {
  if (value == null) return false
  const v = value.toLowerCase().trim()
  return v === '1' || v === 'true' || v === 'yes'
}

export function isKioskSearchParams(searchParams: URLSearchParams): boolean {
  if (searchParams.has(KIOSK_FLAG_PARAM)) return true
  return parseKioskLegacyValue(searchParams.get(KIOSK_LEGACY_PARAM))
}

/** Voegt ?kiosk1 of &kiosk1 toe (geen =waarde). */
export function withKioskQuery(path: string, kiosk: boolean): string {
  if (!kiosk) return path
  return path.includes('?') ? `${path}&${KIOSK_FLAG_PARAM}` : `${path}?${KIOSK_FLAG_PARAM}`
}
