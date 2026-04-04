import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import { superadminCookieDomainForHost, VYSION_SUPERADMIN_COOKIE } from '@/lib/superadmin-cookies'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Alleen paden naar klant-admin (geen open redirect). */
function safeTenantAdminPath(pathParam: string | null): string {
  const raw = (pathParam || '/admin').trim() || '/admin'
  try {
    const dec = decodeURIComponent(raw)
    if (dec.includes('//') || dec.includes('..')) return '/admin'
    if (dec === '/admin' || dec.startsWith('/admin/')) return dec.split('?')[0] || '/admin'
  } catch {
    return '/admin'
  }
  return '/admin'
}

function handoffLoginUrl(request: NextRequest, slug: string, path: string): URL {
  const u = new URL('/superadmin/login', request.nextUrl.origin)
  const nextUrl = `/api/auth/superadmin-tenant-entry?slug=${encodeURIComponent(slug)}&path=${encodeURIComponent(path)}`
  u.searchParams.set('next', nextUrl)
  return u
}

function tenantOriginForSlug(request: NextRequest, slug: string): string | null {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  if (host.includes('localhost') || host === '127.0.0.1' || host.includes('vercel.app')) {
    return null
  }
  if (host.endsWith('ordervysion.com')) return `https://${slug}.ordervysion.com`
  if (host.endsWith('vysionhoreca.com')) return `https://${slug}.vysionhoreca.com`
  return `https://${slug}.ordervysion.com`
}

function attachSuperadminCookies(
  res: NextResponse,
  request: NextRequest,
  id: string,
  email: string,
  name: string
): void {
  const host = (request.headers.get('host') || '').split(':')[0]
  const domain = superadminCookieDomainForHost(host)
  const secure = request.nextUrl.protocol === 'https:'
  const maxAge = 60 * 60 * 24 * 14
  const opts = {
    path: '/',
    maxAge,
    sameSite: 'lax' as const,
    secure,
    httpOnly: false,
    ...(domain ? { domain } : {}),
  }
  res.cookies.set(VYSION_SUPERADMIN_COOKIE.id, id, opts)
  res.cookies.set(VYSION_SUPERADMIN_COOKIE.email, email, opts)
  res.cookies.set(VYSION_SUPERADMIN_COOKIE.name, name || '', opts)
}

/**
 * Superadmin opent de **echte** tenant-URL (subdomein) met server-302 + Set-Cookie.
 * Werkt ook als browser cookies eerder niet goed zette na fetch-login.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim().toLowerCase() || ''
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Ongeldige tenant' }, { status: 400 })
  }

  const path = safeTenantAdminPath(request.nextUrl.searchParams.get('path'))

  const id = request.cookies.get(VYSION_SUPERADMIN_COOKIE.id)?.value?.trim()
  const email = request.cookies.get(VYSION_SUPERADMIN_COOKIE.email)?.value?.trim()
  const name = request.cookies.get(VYSION_SUPERADMIN_COOKIE.name)?.value?.trim() || ''

  if (!id || !email) {
    return NextResponse.redirect(handoffLoginUrl(request, slug, path))
  }

  const headers = new Headers()
  headers.set('x-superadmin-id', id)
  headers.set('x-superadmin-email', email)
  const vn = new NextRequest(request.url, { headers })
  const auth = await verifySuperAdminAccess(vn)
  if (!auth.authorized) {
    return NextResponse.redirect(handoffLoginUrl(request, slug, path))
  }

  const origin = tenantOriginForSlug(request, slug)
  if (!origin) {
    const u = request.nextUrl.clone()
    u.pathname = `/shop/${slug}${path}`
    u.search = ''
    const res = NextResponse.redirect(u)
    attachSuperadminCookies(res, request, id, email, name)
    return res
  }

  const dest = `${origin}${path}`
  const res = NextResponse.redirect(dest)
  attachSuperadminCookies(res, request, id, email, name)
  return res
}
