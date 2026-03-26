/** Homepage grid + /platform/[slug] detail routes (marketing only). */
export const PLATFORM_PAGES = [
  { slug: 'eigen-website', msgKey: 'eigenWebsite' },
  { slug: 'tijdsbesparing', msgKey: 'tijdsbesparing' },
  { slug: 'productupdates', msgKey: 'productupdates' },
  { slug: 'data-en-analyse', msgKey: 'dataEnAnalyse' },
  { slug: 'betalingsmogelijkheid', msgKey: 'betalingsmogelijkheid' },
  { slug: 'voorraadbeheer', msgKey: 'voorraadbeheer' },
  { slug: 'nul-commissie', msgKey: 'nulCommissie' },
  { slug: 'ondersteuning', msgKey: 'ondersteuning' },
  { slug: 'qr-bestellen', msgKey: 'qrBestellen' },
] as const

export type PlatformPageSlug = (typeof PLATFORM_PAGES)[number]['slug']

export function getPlatformPage(slug: string) {
  return PLATFORM_PAGES.find((p) => p.slug === slug)
}
