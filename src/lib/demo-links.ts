/** Publieke demo-omgevingen (marketing). */

export const DEMO_TENANT_SLUG = 'frituurnolim' as const

/** Publieke demo-site — platformtegels bestelplatform & eigen website (https://frituurnolim.ordervysion.com) */
export const DEMO_ORDER_SITE_URL = `https://${DEMO_TENANT_SLUG}.ordervysion.com`

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
      return DEMO_ORDER_SITE_URL
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
