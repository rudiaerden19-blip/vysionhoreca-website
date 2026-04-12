/** i18n-sleutel onder sectorPages.* in messages/*.json */
export type SectorPageContentKey =
  | 'bakkerij'
  | 'horecaSnack'
  | 'kapper'
  | 'retail'
  | 'hardwarePlatform'

/** Marketing SEO-routes onder /sectoren/… — image per sector voor hero. */
export const SECTOR_SEO_ROUTES = {
  bakkerij: {
    path: '/sectoren/bakkerij',
    imageSrc: '/images/kassa-platform-3.png',
    sectorKey: 'bakkerij',
  },
  cafeFrituurKebab: {
    path: '/sectoren/cafe-frituur-kebab',
    imageSrc: '/images/online-order-platform-1.png',
    sectorKey: 'horecaSnack',
  },
  kapper: {
    path: '/sectoren/kapper',
    imageSrc: '/images/kassa-platform-2.png',
    sectorKey: 'kapper',
  },
  retail: {
    path: '/sectoren/retail',
    imageSrc: '/images/kassa-platform-4.png',
    sectorKey: 'retail',
  },
  hardwarePlatform: {
    path: '/sectoren/hardware-en-platform',
    imageSrc: '/images/vysion-beest-product.png',
    sectorKey: 'hardwarePlatform',
  },
} as const satisfies Record<
  string,
  { readonly path: string; readonly imageSrc: string; readonly sectorKey: SectorPageContentKey }
>

export type SectorSeoRouteKey = keyof typeof SECTOR_SEO_ROUTES
