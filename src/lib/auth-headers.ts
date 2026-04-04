'use client'

import { isMarketingDemoTenantSlug } from '@/lib/demo-links'

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

  const superadminId = localStorage.getItem('superadmin_id')
  const superadminEmail = localStorage.getItem('superadmin_email')
  if (superadminId && superadminEmail) {
    headers['x-superadmin-id'] = superadminId
    headers['x-superadmin-email'] = superadminEmail
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
export function isSuperAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return !!(localStorage.getItem('superadmin_id') && localStorage.getItem('superadmin_email'))
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

/** Kalenderdag in België (YYYY-MM-DD) — dagelijkse herauthenticatie voor admin/kassa. */
export function getBrusselsCalendarDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Zet tenant in localStorage met `sessionCalDay` (na login/registratie). */
export function persistTenantSessionWithToday(tenant: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const enriched = { ...tenant, sessionCalDay: getBrusselsCalendarDateString() }
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
 * Pad zoals in de adresbalk op tenant-subdomein (middleware rewrite verwacht pad zonder /shop/slug).
 */
export function internalShopPathToTenantHostPath(internalPath: string, tenantSlug: string): string {
  const prefix = `/shop/${tenantSlug}`
  if (!internalPath.startsWith(prefix)) return '/welkom'
  const rest = internalPath.slice(prefix.length)
  if (!rest || rest === '') return '/'
  return rest.startsWith('/') ? rest : `/${rest}`
}

/** Actieve zaak-sessie voor deze shop (URL-tenant vs localStorage). */
export function isOwnerSessionForTenant(tenantSlug: string): boolean {
  if (!isTenantLoggedIn()) return false
  const cur = getCurrentTenantSlug()
  if (!cur) return false
  return normSlug(cur) === normSlug(tenantSlug)
}

/**
 * Eigenaar mag admin/kassa van deze tenant alleen met wachtwoord-login vandaag (BE).
 * Geen `sessionCalDay` of andere tenant in localStorage → geweigerd.
 */
export function isOwnerSessionFreshForTenant(tenantSlug: string): boolean {
  if (!isOwnerSessionForTenant(tenantSlug)) return false
  const tenantData = localStorage.getItem('vysion_tenant')
  if (!tenantData) return false
  try {
    const tenant = JSON.parse(tenantData) as { sessionCalDay?: string }
    const day = tenant.sessionCalDay
    if (!day || typeof day !== 'string') return false
    return day === getBrusselsCalendarDateString()
  } catch {
    return false
  }
}
