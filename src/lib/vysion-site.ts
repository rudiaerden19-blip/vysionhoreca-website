/** Canonieke marketing-site (www + apex). */
export const VYSION_CANONICAL_ORIGIN = 'https://www.vysion-kassa.com' as const

export const VYSION_WWW_HOST = 'www.vysion-kassa.com' as const
export const VYSION_APEX_HOST = 'vysion-kassa.com' as const

/** Hoofdportaal: geen tenant-subdomein-routing. */
export const VYSION_MAIN_PORTAL_HOSTS = [
  VYSION_WWW_HOST,
  VYSION_APEX_HOST,
  'www.ordervysion.com',
  'ordervysion.com',
] as const

/** Oude / typo-domeinen → 301 naar canoniek (niet vysion-kassa.com zelf). */
export const VYSION_LEGACY_MARKETING_HOSTS = [
  'www.vysionhoreca.com',
  'vysionhoreca.com',
  'vysionkassa.com',
  'www.vysionkassa.com',
] as const

export function vysionCanonicalUrl(path = ''): string {
  if (!path || path === '/') return VYSION_CANONICAL_ORIGIN
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${VYSION_CANONICAL_ORIGIN}${normalized}`
}

export function isVysionMainPortalHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase()
  return (VYSION_MAIN_PORTAL_HOSTS as readonly string[]).includes(h)
}

export function isVysionLegacyMarketingHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase()
  return (VYSION_LEGACY_MARKETING_HOSTS as readonly string[]).includes(h)
}
