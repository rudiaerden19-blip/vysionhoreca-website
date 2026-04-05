/**
 * Alleen **superadmin**-sessie, cross-subdomein (bv. www → tenant.ordervysion.com).
 *
 * **Zaak-eigenaren:** géén cookie — die blijven via `/api/auth/login` + `vysion_tenant` in localStorage
 * (`sessionExpiresAt`, rollende geldigheid). Deze cookies worden nergens bij tenant-login gezet.
 */

/** Zelfde keys in middleware (Edge) + client — niet los laten verspringen. */
export const VYSION_SUPERADMIN_COOKIE = {
  id: 'vysion_sa_id',
  email: 'vysion_sa_email',
  name: 'vysion_sa_name',
} as const

const COOKIE_ID = VYSION_SUPERADMIN_COOKIE.id
const COOKIE_EMAIL = VYSION_SUPERADMIN_COOKIE.email
const COOKIE_NAME = VYSION_SUPERADMIN_COOKIE.name

/** Host-only (geen Domain=) op preview/localhost — server + client. */
export function superadminCookieDomainForHost(hostname: string): string | undefined {
  const h = hostname.toLowerCase().split(':')[0]
  if (h === 'ordervysion.com' || h.endsWith('.ordervysion.com')) return '.ordervysion.com'
  if (h === 'vysionhoreca.com' || h.endsWith('.vysionhoreca.com')) return '.vysionhoreca.com'
  return undefined
}

export function superadminSharedCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return superadminCookieDomainForHost(window.location.hostname)
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const parts = `; ${document.cookie}`.split(`; ${name}=`)
  if (parts.length !== 2) return null
  const raw = parts.pop()?.split(';').shift()
  if (raw == null || raw === '') return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

export function writeSuperadminSessionCookies(id: string, email: string, name: string): void {
  if (typeof document === 'undefined') return
  const domain = superadminSharedCookieDomain()
  const maxAge = 60 * 60 * 24 * 14 // 14 dagen
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const tail = `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`
  const dom = domain ? `; Domain=${domain}` : ''

  const set = (k: string, v: string) => {
    document.cookie = `${k}=${encodeURIComponent(v)}; ${tail}${dom}`
  }
  set(COOKIE_ID, id)
  set(COOKIE_EMAIL, email)
  set(COOKIE_NAME, name)
}

export function clearSuperadminSessionCookies(): void {
  if (typeof document === 'undefined') return
  const domain = superadminSharedCookieDomain()
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const tailClear = `Path=/; Max-Age=0${secure ? '; Secure' : ''}`
  const dom = domain ? `; Domain=${domain}` : ''

  for (const k of [COOKIE_ID, COOKIE_EMAIL, COOKIE_NAME]) {
    document.cookie = `${k}=; ${tailClear}${dom}`
  }
}

/**
 * Cookie → localStorage wanneer er een geldige superadmin-cookie is (cookie is bron van waarheid).
 * Zonder vroege return: oude/lege LS op tenant-subdomein overschrijven zodra cookie er is.
 */
export function mirrorSuperadminSessionFromCookieToLocalStorage(): void {
  if (typeof window === 'undefined') return
  try {
    const id = readCookie(COOKIE_ID)
    const email = readCookie(COOKIE_EMAIL)
    const name = readCookie(COOKIE_NAME)
    if (!id || !email) return
    localStorage.setItem('superadmin_id', id)
    localStorage.setItem('superadmin_email', email)
    if (name) localStorage.setItem('superadmin_name', name)
  } catch {
    /* storage blocked */
  }
}

/** Superadmin direct uit document.cookie (ook als localStorage faalt of leeg blijft). */
export function peekSuperadminFromBrowserCookie(): {
  id: string
  email: string
  name: string | null
} | null {
  if (typeof document === 'undefined') return null
  const id = readCookie(COOKIE_ID)?.trim()
  const email = readCookie(COOKIE_EMAIL)?.trim()
  if (!id || !email) return null
  const nameRaw = readCookie(COOKIE_NAME)
  return { id, email, name: nameRaw?.trim() || null }
}
