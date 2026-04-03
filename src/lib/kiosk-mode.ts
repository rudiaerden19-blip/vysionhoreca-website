/**
 * Kiosk: pad …/kiosk1 (geen query), cookie vysion_kiosk, header x-vysion-kiosk.
 * Legacy query: ?kiosk1 / ?kiosk=1 → redirect naar /kiosk1.
 */
export const KIOSK_FLAG_PARAM = 'kiosk1' as const
export const KIOSK_LEGACY_PARAM = 'kiosk' as const
export const KIOSK_REQUEST_HEADER = 'x-vysion-kiosk' as const
export const KIOSK_COOKIE = 'vysion_kiosk' as const

function parseKioskLegacyValue(value: string | null): boolean {
  if (value == null) return false
  const v = value.toLowerCase().trim()
  return v === '1' || v === 'true' || v === 'yes'
}

export function isKioskSearchParams(searchParams: URLSearchParams): boolean {
  if (searchParams.has(KIOSK_FLAG_PARAM)) return true
  return parseKioskLegacyValue(searchParams.get(KIOSK_LEGACY_PARAM))
}

export function isKioskFromHeaderAndCookie(
  headerVal: string | null | undefined,
  cookieVal: string | undefined
): boolean {
  const h = headerVal?.trim()
  if (h === '1') return true
  const v = cookieVal?.toLowerCase()?.trim()
  return v === '1' || v === 'true'
}

/** Voorheen query toevoegen; kiosk loopt nu via cookie — alleen `path` behouden. */
export function withKioskQuery(path: string, _kiosk: boolean): string {
  return path
}

/** Hosts waar URLs altijd /shop/{tenant}/... blijven (geen korte /kiosk1). */
const MAIN_SHOP_HOSTS = new Set([
  'www.vysionhoreca.com',
  'vysionhoreca.com',
  'www.ordervysion.com',
  'ordervysion.com',
])

export function isMainShopHost(host: string | null | undefined): boolean {
  if (!host) return true
  const h = host.toLowerCase().split(':')[0]
  if (MAIN_SHOP_HOSTS.has(h)) return true
  if (h.endsWith('.vercel.app')) return true
  if (h === 'localhost' || h === '127.0.0.1') return true
  return false
}

export type KioskShopLink =
  | 'kiosk1'
  | 'menu'
  | 'checkout'
  | 'account'
  | 'home'
  | 'accountLogin'
  | 'accountRegister'

/**
 * Op tenant-subdomein (frituurnolim.ordervysion.com) + kiosk: geen /shop in de URL.
 */
export function kioskShopHref(
  tenantSlug: string,
  link: KioskShopLink,
  opts: { kiosk: boolean; shortUrls: boolean }
): string {
  const useShort = opts.kiosk && opts.shortUrls
  if (!useShort) {
    switch (link) {
      case 'kiosk1':
      case 'menu':
        return `/shop/${tenantSlug}/menu`
      case 'checkout':
        return `/shop/${tenantSlug}/checkout`
      case 'account':
        return `/shop/${tenantSlug}/account`
      case 'home':
        return `/shop/${tenantSlug}`
      case 'accountLogin':
        return `/shop/${tenantSlug}/account/login?redirect=checkout`
      case 'accountRegister':
        return `/shop/${tenantSlug}/account/register?redirect=checkout`
      default:
        return `/shop/${tenantSlug}`
    }
  }
  switch (link) {
    case 'kiosk1':
    case 'menu':
      return '/kiosk1'
    case 'checkout':
      return '/checkout'
    case 'account':
      return '/account'
    case 'home':
      return '/'
    case 'accountLogin':
      return '/account/login'
    case 'accountRegister':
      return '/account/register'
    default:
      return '/kiosk1'
  }
}
