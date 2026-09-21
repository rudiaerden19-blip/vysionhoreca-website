import { isVysionLegacyMarketingHost, isVysionMainPortalHost } from '@/lib/vysion-site'

/** Tenant-subdomein (*.ordervysion.com) — admin/welkom/reserveren, geen marketing-sectorpopup. */
export function isTenantShopHostname(hostname: string): boolean {
  const h = hostname.split(':')[0].toLowerCase()
  if (!h) return false
  if (isVysionMainPortalHost(h) || isVysionLegacyMarketingHost(h)) return false
  if (h.includes('localhost') || h === '127.0.0.1' || h.includes('vercel.app')) return false

  if (h.endsWith('.ordervysion.com')) {
    const sub = h.slice(0, -'.ordervysion.com'.length)
    if (sub && sub !== 'www') return true
  }
  return false
}

/** Sector-overlay alleen op marketing (www), nooit op shop/admin/tenant-host. */
export function shouldShowSectorChoiceGate(pathname: string | null, hostname: string): boolean {
  if (!pathname) return false
  if (isTenantShopHostname(hostname)) return false

  if (pathname.startsWith('/shop')) return false
  if (pathname.startsWith('/admin')) return false
  if (pathname.startsWith('/superadmin')) return false
  if (pathname.startsWith('/dashboard')) return false
  if (pathname.startsWith('/keuken')) return false
  if (pathname.startsWith('/login')) return false
  if (pathname.startsWith('/registreer')) return false
  if (pathname.startsWith('/verify-email')) return false
  if (pathname.startsWith('/welkom')) return false
  if (pathname.startsWith('/reserveren')) return false
  if (pathname.startsWith('/menu')) return false
  if (pathname.startsWith('/checkout')) return false
  if (pathname.startsWith('/display')) return false
  if (pathname.startsWith('/account')) return false

  return true
}

/**
 * Popup alleen bij échte paginalaad: eerste bezoek of refresh.
 * Niet bij interne navigatie (zelfde origin in referrer, type navigate).
 */
export function shouldOpenSectorChoiceOnThisLoad(input: {
  navigationType: string | number | undefined
  referrer: string
  pageOrigin: string
}): boolean {
  const { navigationType, referrer, pageOrigin } = input
  if (navigationType === 'reload' || navigationType === 1) return true
  if (navigationType === 'back_forward' || navigationType === 2) return false
  if (!referrer) return true
  try {
    return new URL(referrer).origin !== pageOrigin
  } catch {
    return true
  }
}

export function readPageLoadNavigationType(): string | number | undefined {
  if (typeof performance === 'undefined') return undefined
  const entries = performance.getEntriesByType('navigation')
  const latest = entries[entries.length - 1] as PerformanceNavigationTiming | undefined
  if (latest?.type) return latest.type
  const legacy = (performance as Performance & { navigation?: { type?: number } }).navigation?.type
  return legacy
}
