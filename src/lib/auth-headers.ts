'use client'

import { isMarketingDemoTenantSlug } from '@/lib/demo-links'
import {
  mirrorSuperadminSessionFromCookieToLocalStorage,
  peekSuperadminFromBrowserCookie,
} from '@/lib/superadmin-cookies'

/**
 * Gets authentication headers for API requests.
 * Uses the stored tenant info from localStorage to authenticate requests.
 * 
 * Usage:
 * ```ts
 * const response = await fetch('/api/some-endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...getAuthHeaders()
 *   },
 *   body: JSON.stringify(data)
 * })
 * ```
 */
/**
 * Zet zowel zaak- als superadmin-headers als beide in localStorage staan.
 * API's gebruiken `verifyTenantOrSuperAdmin`: eerst eigenaar van de gevraagde tenant,
 * anders geldige superadmin — zonder beide headers faalt superadmin naast een oude
 * `vysion_tenant` van een andere zaak.
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  mirrorSuperadminSessionFromCookieToLocalStorage()

  const headers: Record<string, string> = {}

  const tenantData = localStorage.getItem('vysion_tenant')
  if (tenantData) {
    try {
      const tenant = JSON.parse(tenantData) as {
        business_id?: string
        id?: string
        email?: string
        tenant_slug?: string
      }
      headers['x-business-id'] = tenant.business_id || tenant.id || ''
      headers['x-auth-email'] = tenant.email || ''
      headers['x-tenant-slug'] = tenant.tenant_slug || ''
    } catch {
      localStorage.removeItem('vysion_tenant')
    }
  }

  let superadminId = localStorage.getItem('superadmin_id')
  let superadminEmail = localStorage.getItem('superadmin_email')
  if (!superadminId?.trim() || !superadminEmail?.trim()) {
    const fromCookie = peekSuperadminFromBrowserCookie()
    if (fromCookie) {
      superadminId = fromCookie.id
      superadminEmail = fromCookie.email
    }
  }
  if (superadminId?.trim() && superadminEmail?.trim()) {
    headers['x-superadmin-id'] = superadminId.trim()
    headers['x-superadmin-email'] = superadminEmail.trim()
  }

  return headers
}

/**
 * Makes an authenticated API request.
 * Automatically includes auth headers from localStorage.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {})
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}

/**
 * Checks if user is logged in as a tenant owner.
 */
export function isTenantLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  const tenantData = localStorage.getItem('vysion_tenant')
  if (!tenantData) return false
  
  try {
    const tenant = JSON.parse(tenantData)
    return !!(tenant.business_id || tenant.id)
  } catch {
    return false
  }
}

/**
 * Checks if user is logged in as superadmin.
 */
/** Alleen superadmin; zaak-sessie (`vysion_tenant`) staat hier los van. */
export function isSuperAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  mirrorSuperadminSessionFromCookieToLocalStorage()
  if (localStorage.getItem('superadmin_id')?.trim() && localStorage.getItem('superadmin_email')?.trim()) {
    return true
  }
  return !!peekSuperadminFromBrowserCookie()
}

/**
 * Gets the current tenant slug from localStorage.
 */
export function getCurrentTenantSlug(): string | null {
  if (typeof window === 'undefined') return null
  const tenantData = localStorage.getItem('vysion_tenant')
  if (!tenantData) return null
  
  try {
    const tenant = JSON.parse(tenantData)
    return tenant.tenant_slug || null
  } catch {
    return null
  }
}

const normSlug = (s: string) => (s || '').replace(/-/g, '').toLowerCase()

/** Na zaak-login (wachtwoord): sessie blijft geldig zolang `sessionExpiresAt` in de toekomst ligt. */
const OWNER_SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000

/** Kalenderdag in België (YYYY-MM-DD) — legacy / backwards compatible. */
export function getBrusselsCalendarDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Zet tenant in localStorage na login/registratie (rollende sessie + legacy dagveld). */
export function persistTenantSessionWithToday(tenant: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const sessionExpiresAt = new Date(Date.now() + OWNER_SESSION_TTL_MS).toISOString()
  const enriched = {
    ...tenant,
    sessionCalDay: getBrusselsCalendarDateString(),
    sessionExpiresAt,
  }
  localStorage.setItem('vysion_tenant', JSON.stringify(enriched))
}

/**
 * Valideer `next` na login: alleen intern pad onder /shop/{slug}/ (geen open redirect).
 */
export function safeInternalNextPath(next: string | null | undefined, tenantSlug: string): string | null {
  if (!next || !tenantSlug) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(next.trim())
  } catch {
    return null
  }
  if (!decoded.startsWith('/') || decoded.includes('//')) return null
  const prefix = `/shop/${tenantSlug}`
  if (decoded !== prefix && !decoded.startsWith(`${prefix}/`)) return null
  return decoded
}

/** Verwijder marketing-demo query (`demo=bekijk`) als de ingelogde tenant geen publieke demo is. */
function stripMarketingDemoSearchForTenant(search: string, tenantSlug: string): string {
  if (!search || search === '?') return ''
  if (isMarketingDemoTenantSlug(tenantSlug)) return search
  const raw = search.startsWith('?') ? search.slice(1) : search
  const sp = new URLSearchParams(raw)
  if (sp.get('demo') === 'bekijk') sp.delete('demo')
  const out = sp.toString()
  return out ? `?${out}` : ''
}

/**
 * Na login: `next` komt van admin-layout als `window.location.pathname` — op tenant-subdomein
 * is dat vaak `/admin` of `/admin/...`, niet `/shop/{slug}/admin`. Zonder deze normalisatie
 * faalt safeInternalNextPath en belandt de gebruiker op /welkom terwijl de sessie net gezet is.
 *
 * Ook: bookmark/CTA met `/shop/frituurnolim/...` op `skippsbv.ordervysion.com` — zelfde pad
 * voor de **ingelogde** tenant, geen open redirect naar andere zaak.
 */
export function normalizeLoginNextPath(
  next: string | null | undefined,
  tenantSlug: string
): string | null {
  const internal = safeInternalNextPath(next, tenantSlug)
  if (internal) return internal
  if (!next || !tenantSlug) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(next.trim())
  } catch {
    return null
  }
  if (!decoded.startsWith('/') || decoded.includes('//')) return null
  const q = decoded.indexOf('?')
  const pathOnly = q === -1 ? decoded : decoded.slice(0, q)
  let search = q === -1 ? '' : decoded.slice(q)

  const shopMatch = pathOnly.match(/^\/shop\/([^/]+)(\/.*)?$/)
  if (shopMatch) {
    const pathTenant = shopMatch[1]
    const rest = shopMatch[2] || ''
    if (rest.includes('..')) return null
    if (normSlug(pathTenant) !== normSlug(tenantSlug) || pathTenant !== tenantSlug) {
      search = stripMarketingDemoSearchForTenant(search, tenantSlug)
      return `/shop/${tenantSlug}${rest}${search}`
    }
  }

  if (pathOnly === '/admin' || pathOnly.startsWith('/admin/')) {
    const rest = pathOnly === '/admin' ? '' : pathOnly.slice('/admin'.length)
    if (rest.includes('..')) return null
    search = stripMarketingDemoSearchForTenant(search, tenantSlug)
    return `/shop/${tenantSlug}/admin${rest}${search}`
  }
  return null
}

/**
 * Zelfde vorm als admin-layout bij redirect naar login: browserpad (evt. `/admin/…` op subdomein)
 * → intern canoniek `/shop/{tenant}/…` voor `?next=`.
 */
export function buildShopInternalReturnPath(
  tenantSlug: string,
  browserPathname: string,
  browserSearch: string = ''
): string {
  const path = browserPathname
  const search = browserSearch || ''
  if (path === '/admin' || path.startsWith('/admin/')) {
    return `/shop/${tenantSlug}/admin${path === '/admin' ? '' : path.slice('/admin'.length)}${search}`
  }
  return `${path}${search}`
}

/**
 * Pad zoals in de adresbalk op tenant-subdomein (middleware rewrite verwacht pad zonder /shop/slug).
 * Slug in URL en `tenantSlug` uit login mogen qua koppeltekens verschillen zolang normSlug gelijk is.
 */
export function internalShopPathToTenantHostPath(internalPath: string, tenantSlug: string): string {
  const qIndex = internalPath.indexOf('?')
  const pathOnly = qIndex === -1 ? internalPath : internalPath.slice(0, qIndex)
  const search = qIndex === -1 ? '' : internalPath.slice(qIndex)

  const m = pathOnly.match(/^\/shop\/([^/]+)(\/.*)?$/)
  if (!m) return '/welkom'
  const pathSlug = m[1]
  const rest = m[2] || ''
  if (normSlug(pathSlug) !== normSlug(tenantSlug)) return '/welkom'

  if (!rest || rest === '') return search ? `/${search}` : '/'
  const pathPart = rest.startsWith('/') ? rest : `/${rest}`
  return `${pathPart}${search}`
}

/** Actieve zaak-sessie voor deze shop (URL-tenant vs localStorage). */
export function isOwnerSessionForTenant(tenantSlug: string): boolean {
  if (!isTenantLoggedIn()) return false
  const cur = getCurrentTenantSlug()
  if (!cur) return false
  return normSlug(cur) === normSlug(tenantSlug)
}

/**
 * Eigenaar mag admin/kassa van deze tenant na wachtwoord-login tot `sessionExpiresAt`
 * (rollende periode). Oude sessies zonder `sessionExpiresAt`: alleen die kalenderdag (BE).
 */
export function isOwnerSessionFreshForTenant(tenantSlug: string): boolean {
  if (!isOwnerSessionForTenant(tenantSlug)) return false
  const tenantData = localStorage.getItem('vysion_tenant')
  if (!tenantData) return false
  try {
    const tenant = JSON.parse(tenantData) as {
      sessionCalDay?: string
      sessionExpiresAt?: string
    }
    if (tenant.sessionExpiresAt) {
      const exp = new Date(tenant.sessionExpiresAt).getTime()
      if (!Number.isNaN(exp)) return exp > Date.now()
    }
    const day = tenant.sessionCalDay
    if (!day || typeof day !== 'string') return false
    return day === getBrusselsCalendarDateString()
  } catch {
    return false
  }
}
