/** i18n-sleutel onder sectorPages.* in messages/*.json */
export type SectorPageContentKey = 'bakkerij' | 'cafe' | 'frituur' | 'kebab' | 'kapper' | 'retail'

/** Marketing SEO-routes onder /sectoren/… — image per sector voor hero. */
export const SECTOR_SEO_ROUTES = {
  bakkerij: {
    path: '/sectoren/bakkerij',
    imageSrc: '/images/kassa-platform-3.png',
    sectorKey: 'bakkerij',
  },
  cafe: {
    path: '/sectoren/cafe',
    imageSrc: '/images/online-order-platform-1.png',
    sectorKey: 'cafe',
  },
  frituur: {
    path: '/sectoren/frituur',
    imageSrc: '/images/online-order-platform-1.png',
    sectorKey: 'frituur',
  },
  kebab: {
    path: '/sectoren/kebab',
    imageSrc: '/images/online-order-platform-1.png',
    sectorKey: 'kebab',
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
} as const satisfies Record<
  string,
  { readonly path: string; readonly imageSrc: string; readonly sectorKey: SectorPageContentKey }
>

export type SectorSeoRouteKey = keyof typeof SECTOR_SEO_ROUTES
