import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEMO_TENANT_SLUG } from '@/lib/demo-links'
import { isKioskSearchParams, KIOSK_COOKIE, KIOSK_REQUEST_HEADER } from '@/lib/kiosk-mode'

function setKioskCookie(res: NextResponse, request: NextRequest) {
  res.cookies.set(KIOSK_COOKIE, '1', {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 180,
    secure: request.nextUrl.protocol === 'https:',
  })
}

/** URL in de balk blijft /kiosk1 of …/kiosk1; internally menu + kiosk-header + cookie. */
function rewriteMenuAsKiosk(request: NextRequest, menuPathname: string): NextResponse {
  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = menuPathname
  const reqHeaders = new Headers(request.headers)
  reqHeaders.set(KIOSK_REQUEST_HEADER, '1')
  const res = NextResponse.rewrite(rewriteUrl, { request: { headers: reqHeaders } })
  setKioskCookie(res, request)
  return res
}

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
    /** /shop/tenant/kiosk1 → menu (zonder ? in de URL). */
    const kioskPathMatch = pathname.match(/^\/shop\/([^/]+)\/kiosk1\/?$/)
    if (kioskPathMatch) {
      return rewriteMenuAsKiosk(request, `/shop/${kioskPathMatch[1]}/menu`)
    }
    /** Legacy: /shop/tenant?kiosk1 → /shop/tenant/kiosk1 */
    if (isKioskSearchParams(url.searchParams)) {
      const shopRoot = pathname.match(/^\/shop\/([^/]+)\/?$/)
      if (shopRoot) {
        const redir = request.nextUrl.clone()
        redir.pathname = `/shop/${shopRoot[1]}/kiosk1`
        redir.search = ''
        return NextResponse.redirect(redir)
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
  let subdomain = ''

  if (hostname.includes('ordervysion.com')) {
    const parts = hostname.split('.')
    if (parts[0] === 'www' && parts.length >= 3) {
      subdomain = parts[1]
    } else if (parts.length >= 2) {
      subdomain = parts[0]
    }
  } else {
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

  /** tenant.domein/kiosk1 → menu, URL blijft /kiosk1 */
  if (pathname === '/kiosk1' || pathname === '/kiosk1/') {
    return rewriteMenuAsKiosk(request, `/shop/${subdomain}/menu`)
  }

  /** Legacy: tenant.domein/?kiosk1 → /kiosk1 */
  if (isKioskSearchParams(url.searchParams) && pathname === '/') {
    const redir = request.nextUrl.clone()
    redir.pathname = '/kiosk1'
    redir.search = ''
    return NextResponse.redirect(redir)
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
    const pathParts = pathname.split('/')
    pathParts[2] = subdomain
    url.pathname = pathParts.join('/')
  } else {
    url.pathname = `/shop/${subdomain}${pathname === '/' ? '' : pathname}`
  }

  const res = NextResponse.rewrite(url)
  if (hostname.includes('ordervysion.com') && subdomain === DEMO_TENANT_SLUG) {
    res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
  }
  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
