/** Homepage grid + /platform/[slug] detail routes (marketing only). */

/** Zelfde afbeelding als op de platformkaart + volle-breedte hero op /platform/bestelplatform. */
export const BESTELPLATFORM_HERO_IMAGE = '/images/platform/bestelplatform-hero.png'

export type PlatformPageEntry = {
  slug: string
  msgKey: string
  /** Optional photo strip bovenaan de kaart (homepage grid). */
  cardHeaderImage?: string
  /** Geen ronde Lucide-icon onder de foto (bv. bestelplatform: alleen foto → titel → teaser). */
  hideCardIcon?: boolean
}

export const PLATFORM_PAGES: PlatformPageEntry[] = [
  { slug: 'kassasysteem', msgKey: 'kassasysteem' },
  {
    slug: 'bestelplatform',
    msgKey: 'bestelplatform',
    cardHeaderImage: BESTELPLATFORM_HERO_IMAGE,
    hideCardIcon: true,
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
