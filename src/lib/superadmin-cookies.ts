/**
 * Alleen **superadmin**-sessie, cross-subdomein (bv. www → tenant.ordervysion.com).
 *
 * **Zaak-eigenaren:** géén cookie — die blijven alleen via `/api/auth/login` + `vysion_tenant`
 * in localStorage (dagelijkse `sessionCalDay`). Deze cookies worden nergens bij tenant-login gezet.
 */

const COOKIE_ID = 'vysion_sa_id'
const COOKIE_EMAIL = 'vysion_sa_email'
const COOKIE_NAME = 'vysion_sa_name'

export function superadminSharedCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const h = window.location.hostname.toLowerCase()
  if (h === 'ordervysion.com' || h.endsWith('.ordervysion.com')) return '.ordervysion.com'
  if (h === 'vysionhoreca.com' || h.endsWith('.vysionhoreca.com')) return '.vysionhoreca.com'
  return undefined
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

/** Zet cookie-waarden in localStorage op dit host als daar nog geen superadmin staat. */
export function mirrorSuperadminSessionFromCookieToLocalStorage(): void {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem('superadmin_id') && localStorage.getItem('superadmin_email')) return
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
