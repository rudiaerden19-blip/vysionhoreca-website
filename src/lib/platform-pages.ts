/** Homepage grid + /platform/[slug] detail routes (marketing only). */
export type PlatformPageEntry = {
  slug: string
  msgKey: string
  /** Optional photo strip bovenaan de kaart (homepage grid). */
  cardHeaderImage?: string
}

export const PLATFORM_PAGES: PlatformPageEntry[] = [
  { slug: 'kassasysteem', msgKey: 'kassasysteem' },
  {
    slug: 'bestelplatform',
    msgKey: 'bestelplatform',
    cardHeaderImage: '/images/platform/card-header-bestelplatform.png',
  },
  { slug: 'keukenschermen', msgKey: 'keukenschermen' },
  { slug: 'online-scherm', msgKey: 'onlineScherm' },
  { slug: 'reservaties', msgKey: 'reservaties' },
  { slug: 'eigen-website', msgKey: 'eigenWebsite' },
  { slug: 'whatsapp-bestellingen', msgKey: 'whatsappBestellingen' },
  { slug: 'loonadministratie', msgKey: 'loonadministratie' },
  { slug: 'bedrijfsanalyse', msgKey: 'bedrijfsanalyse' },
  { slug: 'kostencalculator', msgKey: 'kostencalculator' },
]

export type PlatformPageSlug = (typeof PLATFORM_PAGES)[number]['slug']

export function getPlatformPage(slug: string) {
  return PLATFORM_PAGES.find((p) => p.slug === slug)
}
