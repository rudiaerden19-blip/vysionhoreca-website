/** Publieke demo-omgevingen (marketing). */

export const DEMO_TENANT_SLUG = 'frituurnolim' as const

const DEMO_ORIGIN = `https://${DEMO_TENANT_SLUG}.ordervysion.com`

/** Demo-kassa (admin) op tenant-subdomein */
export const DEMO_KASSA_URL = `${DEMO_ORIGIN}/admin/kassa`

/** Klantzijde: online bestellen / shop op subdomein */
export const DEMO_ORDER_SITE_URL = DEMO_ORIGIN

/**
 * “Bekijk demo” op homepage/hero: kassa (POS), niet de webshop-root.
 * Webshop-root zou bezoekers laten bestellen i.p.v. het systeem zien.
 */
export const DEMO_HERO_LIVE_URL = DEMO_KASSA_URL

/**
 * Per platformtegel: “Test het hier” — de meeste tegels naar dezelfde demokassa.
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
