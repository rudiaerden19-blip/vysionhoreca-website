import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEMO_TENANT_SLUG } from '@/lib/demo-links'
import { isKioskSearchParams } from '@/lib/kiosk-mode'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  /** Superadmin: no CDN/browser cache — users were seeing stale UI zonder Modules-knop. */
  if (pathname.startsWith('/superadmin')) {
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
    return res
  }

  const hostname = request.headers.get('host') || ''
  
  // Main domains - skip subdomain routing (exact match only)
  const exactMainDomains = [
    'www.vysionhoreca.com',
    'vysionhoreca.com',
    'www.ordervysion.com',
    'ordervysion.com',
  ]
  
  // Check for exact match or localhost/vercel
  const isMainDomain = 
    exactMainDomains.includes(hostname) ||
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('vercel.app')
  
  if (isMainDomain) {
    /** vaste kiosk-URL: /shop/tenant?kiosk1 of ?kiosk=1 → direct menu. */
    if (isKioskSearchParams(url.searchParams)) {
      const shopRoot = pathname.match(/^\/shop\/([^/]+)\/?$/)
      if (shopRoot) {
        url.pathname = `/shop/${shopRoot[1]}/menu`
        return NextResponse.redirect(url)
      }
    }
    return NextResponse.next()
  }

  // Redirect www.tenant.ordervysion.com to tenant.ordervysion.com
  // (wildcard SSL only covers one level of subdomains)
  if (hostname.includes('ordervysion.com')) {
    const parts = hostname.split('.')
    // www.frituurrudi.ordervysion.com -> ['www', 'frituurrudi', 'ordervysion', 'com']
    if (parts[0] === 'www' && parts.length === 4) {
      const tenant = parts[1]
      const redirectUrl = `https://${tenant}.ordervysion.com${url.pathname}${url.search}`
      return NextResponse.redirect(redirectUrl, 301)
    }
  }

  // Extract subdomain from hostname
  // Examples:
  // - naamzaak.ordervysion.com -> naamzaak
  // - www.naamzaak.ordervysion.com -> naamzaak
  // - frituur-rudi.ordervysion.com -> frituur-rudi
  let subdomain = ''
  
  if (hostname.includes('ordervysion.com')) {
    // For ordervysion.com domain
    const parts = hostname.split('.')
    if (parts[0] === 'www' && parts.length >= 3) {
      subdomain = parts[1] // www.naamzaak.ordervysion.com -> naamzaak
    } else if (parts.length >= 2) {
      subdomain = parts[0] // naamzaak.ordervysion.com -> naamzaak
    }
  } else {
    // For other domains, extract first part
    const parts = hostname.split('.')
    if (parts[0] === 'www' && parts.length >= 3) {
      subdomain = parts[1]
    } else if (parts.length >= 2) {
      subdomain = parts[0]
    }
  }
  
  // Skip if no valid subdomain found
  if (!subdomain || subdomain === 'www' || subdomain.length === 0) {
    return NextResponse.next()
  }

  /** tenant.domein/?kiosk1 → /menu?kiosk1 (geen landingspagina). */
  if (isKioskSearchParams(url.searchParams) && pathname === '/') {
    url.pathname = '/menu'
    return NextResponse.redirect(url)
  }

  // Rewrite all requests to use /shop/[tenant] structure
  // This allows existing code to work without changes
  
  // Skip rewriting for API routes, static files, and admin routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/registreer') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/kassa') ||
    pathname.startsWith('/keuken') ||
    pathname.startsWith('/monitoring')
  ) {
    return NextResponse.next()
  }

  // Rewrite to shop/[tenant] path
  if (pathname.startsWith('/shop/')) {
    // Replace tenant in existing path
    const pathParts = pathname.split('/')
    pathParts[2] = subdomain
    url.pathname = pathParts.join('/')
  } else {
    // Add tenant prefix
    url.pathname = `/shop/${subdomain}${pathname === '/' ? '' : pathname}`
  }

  const res = NextResponse.rewrite(url)
  // Publieke demo: geen CDN/browser-cache van HTML — anders blijft oude titel/kleuren lang staan na uurlijkse reset
  if (hostname.includes('ordervysion.com') && subdomain === DEMO_TENANT_SLUG) {
    res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
  }
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
