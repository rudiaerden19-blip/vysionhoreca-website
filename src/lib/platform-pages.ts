/** Homepage grid + /platform/[slug] detail routes (marketing only). */
export const PLATFORM_PAGES = [
  { slug: 'kassasysteem', msgKey: 'kassasysteem' },
  { slug: 'bestelplatform', msgKey: 'bestelplatform' },
  { slug: 'bestelzuilen', msgKey: 'bestelzuilen' },
  { slug: 'keukenschermen', msgKey: 'keukenschermen' },
  { slug: 'online-scherm', msgKey: 'onlineScherm' },
  { slug: 'reservaties', msgKey: 'reservaties' },
  { slug: 'eigen-website', msgKey: 'eigenWebsite' },
  { slug: 'whatsapp-bestellingen', msgKey: 'whatsappBestellingen' },
  { slug: 'loonadministratie', msgKey: 'loonadministratie' },
  { slug: 'bedrijfsanalyse', msgKey: 'bedrijfsanalyse' },
  { slug: 'kostencalculator', msgKey: 'kostencalculator' },
] as const

export type PlatformPageSlug = (typeof PLATFORM_PAGES)[number]['slug']

export function getPlatformPage(slug: string) {
  return PLATFORM_PAGES.find((p) => p.slug === slug)
}
