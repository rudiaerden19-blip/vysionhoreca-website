import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // Main domains - skip subdomain routing
  const mainDomains = [
    'localhost',
    '127.0.0.1',
    'www.vysionhoreca.com',
    'vysionhoreca.com',
  ]
  
  const isMainDomain = mainDomains.some(domain => hostname.includes(domain)) ||
    hostname.includes('vercel.app')
  
  if (isMainDomain) {
    return NextResponse.next()
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

  // Rewrite all requests to use /shop/[tenant] structure
  // This allows existing code to work without changes
  const pathname = url.pathname
  
  // Skip rewriting for API routes, static files, and admin routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/registreer') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/kassa')
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
  
  return NextResponse.rewrite(url)
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
