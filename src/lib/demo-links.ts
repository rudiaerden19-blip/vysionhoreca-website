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
 * Per platformtegel: juiste demourl (kassa vs. bestelplatform vs. keuken, …).
 * `msgKey` komt overeen met `PLATFORM_PAGES[].msgKey` in `platform-pages.ts`.
 */
export function demoUrlForPlatformCard(msgKey: string): string {
  switch (msgKey) {
    case 'kassasysteem':
      return DEMO_KASSA_URL
    case 'bestelplatform':
    case 'whatsappBestellingen':
    case 'eigenWebsite':
      return DEMO_ORDER_SITE_URL
    case 'keukenschermen':
      return `${DEMO_ORIGIN}/keuken/${DEMO_TENANT_SLUG}`
    case 'onlineScherm':
      return `${DEMO_ORIGIN}/display`
    case 'reservaties':
      return `${DEMO_ORIGIN}/admin/reserveringen`
    case 'loonadministratie':
      return `${DEMO_ORIGIN}/admin/uren`
    case 'bedrijfsanalyse':
      return `${DEMO_ORIGIN}/admin/analyse`
    case 'kostencalculator':
      return `${DEMO_ORIGIN}/admin/kosten/producten`
    default:
      return DEMO_ORDER_SITE_URL
  }
}
