/**
 * Helper functions for generating tenant URLs
 * Supports both subdomain (www.naamzaak.ordervysion.com) and path-based (/shop/naamzaak) URLs
 */

/**
 * Get the tenant URL base
 * Returns subdomain URL if on subdomain, otherwise returns path-based URL
 */
export function getTenantUrl(tenantSlug: string, path: string = ''): string {
  if (typeof window === 'undefined') {
    // Server-side: use path-based for now
    return `/shop/${tenantSlug}${path}`
  }

  const hostname = window.location.hostname
  
  // Check if we're on a subdomain (not localhost, not main domain)
  const isMainDomain = 
    hostname === 'ordervysion.com' ||
    hostname === 'www.ordervysion.com' ||
    hostname === 'vysionhoreca.com' ||
    hostname === 'www.vysionhoreca.com'
  
  const isSubdomain = 
    !hostname.includes('localhost') &&
    !hostname.includes('127.0.0.1') &&
    !hostname.includes('vercel.app') &&
    !isMainDomain &&
    hostname.split('.').length >= 2

  if (isSubdomain) {
    // We're already on a subdomain - use relative paths
    return path || '/'
  }

  // Use path-based URL
  return `/shop/${tenantSlug}${path}`
}

/**
 * Get full tenant URL with protocol and domain
 * For subdomain: https://www.naamzaak.ordervysion.com
 * For path: https://www.vysionhoreca.com/shop/naamzaak
 */
export function getTenantFullUrl(tenantSlug: string, path: string = '', useSubdomain: boolean = true): string {
  if (typeof window === 'undefined') {
    // Server-side: default to subdomain format
    if (useSubdomain) {
      return `https://www.${tenantSlug}.ordervysion.com${path}`
    }
    return `https://www.vysionhoreca.com/shop/${tenantSlug}${path}`
  }

  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const isMainDomain2 = 
    hostname === 'ordervysion.com' ||
    hostname === 'www.ordervysion.com' ||
    hostname === 'vysionhoreca.com' ||
    hostname === 'www.vysionhoreca.com'
  
  const isSubdomain = 
    !hostname.includes('localhost') &&
    !hostname.includes('127.0.0.1') &&
    !hostname.includes('vercel.app') &&
    !isMainDomain2

  if (isSubdomain || useSubdomain) {
    return `${protocol}//www.${tenantSlug}.ordervysion.com${path}`
  }

  return `${protocol}//www.vysionhoreca.com/shop/${tenantSlug}${path}`
}

/**
 * Get current tenant slug from URL or subdomain
 */
export function getCurrentTenantSlug(): string | null {
  if (typeof window === 'undefined') return null

  const hostname = window.location.hostname
  const pathname = window.location.pathname

  // Check if we're on a subdomain
  const isMainDomain3 = 
    hostname === 'ordervysion.com' ||
    hostname === 'www.ordervysion.com' ||
    hostname === 'vysionhoreca.com' ||
    hostname === 'www.vysionhoreca.com'
  
  const isSubdomain = 
    !hostname.includes('localhost') &&
    !hostname.includes('127.0.0.1') &&
    !hostname.includes('vercel.app') &&
    !isMainDomain3

  if (isSubdomain) {
    // Extract from subdomain
    const parts = hostname.split('.')
    if (parts[0] === 'www' && parts.length >= 3) {
      return parts[1] // www.naamzaak.ordervysion.com
    } else if (parts.length >= 2) {
      return parts[0] // naamzaak.ordervysion.com
    }
  }

  // Extract from path
  const match = pathname.match(/^\/shop\/([^/]+)/)
  return match ? match[1] : null
}
