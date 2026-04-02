/** Publieke demo-omgevingen (marketing). */

export const DEMO_TENANT_SLUG = 'frituurnolim' as const

/** Publieke demo-site — platformtegels bestelplatform & eigen website (https://frituurnolim.ordervysion.com) */
export const DEMO_ORDER_SITE_URL = `https://${DEMO_TENANT_SLUG}.ordervysion.com`

/**
 * Zelfde shop met `demo=bekijk`: zet sessie-flag voor publieke admin (iPad/Safari behoudt zo toegang
 * na interne navigatie zonder querystring).
 */
export const DEMO_ORDER_SITE_URL_WITH_DEMO = `${DEMO_ORDER_SITE_URL}?demo=bekijk`

/** sessionStorage: marketing demo “geen login” voor frituurnolim (+ alias frituur-nolim). */
export const DEMO_PUBLIC_SESSION_STORAGE_KEY = 'vysion_marketing_demo_bekijk_tenant'

export function normalizeTenantSlugKey(slug: string): string {
  return slug.toLowerCase().trim().replace(/-/g, '')
}

/** Canonical demo tenant(s) op marketing / subdomein — niet alleen exact DEMO_TENANT_SLUG. */
export function isMarketingDemoTenantSlug(slug: string): boolean {
  return normalizeTenantSlugKey(slug) === normalizeTenantSlugKey(DEMO_TENANT_SLUG)
}

/** Zet sessie alleen bij expliciete demo-query op die tenant. */
export function persistPublicDemoSessionIfNeeded(tenant: string, search: string): void {
  if (typeof window === 'undefined' || !isMarketingDemoTenantSlug(tenant)) return
  if (!isPublicDemoKassaSearch(search)) return
  try {
    window.sessionStorage.setItem(DEMO_PUBLIC_SESSION_STORAGE_KEY, tenant)
  } catch {
    /* ignore */
  }
}

export function readPublicDemoSessionTenant(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(DEMO_PUBLIC_SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearPublicDemoSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(DEMO_PUBLIC_SESSION_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function publicDemoSessionMatchesTenant(tenant: string): boolean {
  const v = readPublicDemoSessionTenant()
  if (!v) return false
  return normalizeTenantSlugKey(v) === normalizeTenantSlugKey(tenant)
}

/**
 * Pad naar publieke kassa zonder demo-query → `/shop/:tenant/admin/kassa?demo=bekijk`.
 * Ondersteunt zowel `/shop/frituurnolim/admin/kassa` als tenant-subdomein-URL `/admin/kassa`.
 */
export function withPublicDemoSearchOnKassaPath(nextPath: string): string | null {
  if (!nextPath.includes('/admin/kassa')) return null
  const qPart = nextPath.includes('?') ? nextPath.slice(nextPath.indexOf('?')) : ''
  if (isPublicDemoKassaSearch(qPart || '?')) return null

  const pathOnly = nextPath.includes('?') ? nextPath.slice(0, nextPath.indexOf('?')) : nextPath
  let tenant: string | null = null
  const mShop = pathOnly.match(/^\/shop\/([^/]+)\/admin\/kassa/)
  if (mShop) tenant = mShop[1]
  else if (pathOnly === '/admin/kassa' || pathOnly.startsWith('/admin/kassa/')) {
    tenant = DEMO_TENANT_SLUG
  }
  if (!tenant || !isMarketingDemoTenantSlug(tenant)) return null

  const sp = new URLSearchParams(nextPath.includes('?') ? nextPath.split('?')[1] || '' : '')
  sp.set('demo', 'bekijk')
  return `/shop/${tenant}/admin/kassa?${sp.toString()}`
}

/**
 * Publieke alleen-bekijken-kassa — zie admin layout (frituurnolim + deze query = geen login).
 * Zelfde als `alleen_lezen=1` (gebruikt in e2e).
 */
export const DEMO_KASSA_PUBLIC_QUERY = 'demo=bekijk' as const

/** Demo-kassa (admin) op hetzelfde subdomein, met publieke view-only gate */
export const DEMO_KASSA_URL = `${DEMO_ORDER_SITE_URL}/admin/kassa?${DEMO_KASSA_PUBLIC_QUERY}`

/** Prefill op /login wanneer iemand tóch op het inlogscherm komt (b.v. oude bookmark). Publiek demoprofiel. */
export const DEMO_MARKETING_LOGIN_EMAIL = 'info@frituurnolim.be'
export const DEMO_MARKETING_LOGIN_PASSWORD = '123456'

export function isPublicDemoKassaSearch(search: string): boolean {
  const q = search.startsWith('?') ? search.slice(1) : search
  const sp = new URLSearchParams(q)
  return sp.get('demo') === 'bekijk' || sp.get('alleen_lezen') === '1'
}

/**
 * “Bekijk demo” op homepage/hero: kassa (POS), niet de webshop-root.
 * Webshop-root zou bezoekers laten bestellen i.p.v. het systeem zien.
 */
export const DEMO_HERO_LIVE_URL = DEMO_KASSA_URL

/**
 * Per platformtegel: CTA “Start gratis demo” — de meeste tegels naar dezelfde demokassa.
 * `msgKey` komt overeen met `PLATFORM_PAGES[].msgKey` in `platform-pages.ts`.
 */
export function demoUrlForPlatformCard(msgKey: string): string {
  switch (msgKey) {
    case 'bestelplatform':
    case 'eigenWebsite':
      return DEMO_ORDER_SITE_URL_WITH_DEMO
    case 'kassasysteem':
    case 'keukenschermen':
    case 'onlineScherm':
    case 'reservaties':
    case 'whatsappBestellingen':
    case 'loonadministratie':
    case 'bedrijfsanalyse':
    case 'kostencalculator':
      return DEMO_KASSA_URL
    default:
      return DEMO_ORDER_SITE_URL
  }
}
