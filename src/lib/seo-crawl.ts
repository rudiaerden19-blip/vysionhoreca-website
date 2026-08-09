/** Paden die niet in Google thuishoren (login, kassa, tenant-admin, …). */
export function shouldNoIndexPathname(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true
  if (pathname === '/login' || pathname.startsWith('/login/')) return true
  if (pathname.startsWith('/dashboard')) return true
  if (pathname.startsWith('/superadmin')) return true
  if (pathname.startsWith('/keuken/')) return true
  if (pathname.startsWith('/verify-email')) return true
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true
  if (/^\/shop\/[^/]+\/admin(\/|$)/.test(pathname)) return true
  if (/^\/shop\/[^/]+\/display(\/|$)/.test(pathname)) return true
  if (/^\/shop\/[^/]+\/klantscherm(\/|$)/.test(pathname)) return true
  return false
}

export function applySeoResponseHeaders(
  response: { headers: Headers },
  pathname: string,
): typeof response {
  if (shouldNoIndexPathname(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
}
