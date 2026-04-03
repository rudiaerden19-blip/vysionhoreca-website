/**
 * Kiosk: pad …/kiosk1 (geen query), cookie vysion_kiosk, header x-vysion-kiosk.
 * Legacy query: ?kiosk1 / ?kiosk=1 → redirect naar /kiosk1.
 */
export const KIOSK_FLAG_PARAM = 'kiosk1' as const
export const KIOSK_LEGACY_PARAM = 'kiosk' as const
export const KIOSK_REQUEST_HEADER = 'x-vysion-kiosk' as const
export const KIOSK_COOKIE = 'vysion_kiosk' as const

function parseKioskLegacyValue(value: string | null): boolean {
  if (value == null) return false
  const v = value.toLowerCase().trim()
  return v === '1' || v === 'true' || v === 'yes'
}

export function isKioskSearchParams(searchParams: URLSearchParams): boolean {
  if (searchParams.has(KIOSK_FLAG_PARAM)) return true
  return parseKioskLegacyValue(searchParams.get(KIOSK_LEGACY_PARAM))
}

export function isKioskFromHeaderAndCookie(
  headerVal: string | null | undefined,
  cookieVal: string | undefined
): boolean {
  const h = headerVal?.trim()
  if (h === '1') return true
  const v = cookieVal?.toLowerCase()?.trim()
  return v === '1' || v === 'true'
}

/** Voorheen query toevoegen; kiosk loopt nu via cookie — alleen `path` behouden. */
export function withKioskQuery(path: string, _kiosk: boolean): string {
  return path
}
