/** Homepage grid + /platform/[slug] detail routes (marketing only). */

/** Zelfde afbeelding als op de platformkaart (homepage-grid). */
export const BESTELPLATFORM_HERO_IMAGE = '/images/platform/bestelplatform-hero.jpg'

/** Brede hero op /platform/bestelplatform (smartphone bestellen). */
export const BESTELPLATFORM_PAGE_HERO_IMAGE = '/images/platform/bestelplatform-page-hero.jpg'

/** Volle-breedte hero op /platform/kassasysteem. */
export const KASSASYSTEEM_HERO_IMAGE = '/images/platform/kassasysteem-hero.png'

/** Horeca POS-sectie op /platform/kassasysteem */
export const HORECA_KASSASYSTEEM_POS_IMAGE = '/images/platform/horeca-kassasysteem-pos.png'

export const KASSASYSTEEM_CARD_IMAGE = '/images/platform/kassasysteem-card.png'
export const KEUKENSCHERMEN_CARD_IMAGE = '/images/platform/keukenschermen-card.png'
export const RESERVATIES_CARD_IMAGE = '/images/platform/reservaties-card.png'
export const ONLINE_SCHERM_CARD_IMAGE = '/images/platform/online-scherm-card.png'
export const EIGEN_WEBSITE_CARD_IMAGE = '/images/platform/eigen-website-card.png'
export const WHATSAPP_BESTELLINGEN_CARD_IMAGE = '/images/platform/whatsapp-bestellingen-card.png'
export const LOONADMINISTRATIE_CARD_IMAGE = '/images/platform/loonadministratie-card.png'
export const BEDRIJFSANALYSE_CARD_IMAGE = '/images/platform/bedrijfsanalyse-card.png'
export const KOSTENCALCULATOR_CARD_IMAGE = '/images/platform/kostencalculator-card.png'

export type PlatformPageEntry = {
  slug: string
  msgKey: string
  /** Optional photo strip bovenaan de kaart (homepage grid). */
  cardHeaderImage?: string
}

export const PLATFORM_PAGES: PlatformPageEntry[] = [
  { slug: 'kassasysteem', msgKey: 'kassasysteem', cardHeaderImage: KASSASYSTEEM_CARD_IMAGE },
  {
    slug: 'bestelplatform',
    msgKey: 'bestelplatform',
    cardHeaderImage: BESTELPLATFORM_HERO_IMAGE,
  },
  { slug: 'keukenschermen', msgKey: 'keukenschermen', cardHeaderImage: KEUKENSCHERMEN_CARD_IMAGE },
  { slug: 'online-scherm', msgKey: 'onlineScherm', cardHeaderImage: ONLINE_SCHERM_CARD_IMAGE },
  { slug: 'reservaties', msgKey: 'reservaties', cardHeaderImage: RESERVATIES_CARD_IMAGE },
  { slug: 'eigen-website', msgKey: 'eigenWebsite', cardHeaderImage: EIGEN_WEBSITE_CARD_IMAGE },
  {
    slug: 'whatsapp-bestellingen',
    msgKey: 'whatsappBestellingen',
    cardHeaderImage: WHATSAPP_BESTELLINGEN_CARD_IMAGE,
  },
  { slug: 'loonadministratie', msgKey: 'loonadministratie', cardHeaderImage: LOONADMINISTRATIE_CARD_IMAGE },
  { slug: 'bedrijfsanalyse', msgKey: 'bedrijfsanalyse', cardHeaderImage: BEDRIJFSANALYSE_CARD_IMAGE },
  { slug: 'kostencalculator', msgKey: 'kostencalculator', cardHeaderImage: KOSTENCALCULATOR_CARD_IMAGE },
]

export type PlatformPageSlug = (typeof PLATFORM_PAGES)[number]['slug']

export function getPlatformPage(slug: string) {
  return PLATFORM_PAGES.find((p) => p.slug === slug)
}
