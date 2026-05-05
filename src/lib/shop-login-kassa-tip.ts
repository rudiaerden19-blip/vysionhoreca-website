/** Query op `/login` na POS-uitloggen: hint over browservenster / PWA sluiten */
export const LOGIN_QUERY_KASSA_CLOSE_TIP = 'kassa_sluit_tip'

export function appendKassaCloseTipToAbsoluteLoginUrl(absoluteLoginUrl: string): string {
  try {
    const u = new URL(absoluteLoginUrl)
    if (u.pathname.replace(/\/$/, '') !== '/login') return absoluteLoginUrl
    u.searchParams.set(LOGIN_QUERY_KASSA_CLOSE_TIP, '1')
    return u.href
  } catch {
    return absoluteLoginUrl
  }
}

/** `href` bv. `/login` of `/login?next=…` (relatief tot origin). */
export function appendKassaCloseTipToLoginPathHref(href: string): string {
  if (!href.startsWith('/login')) return href
  if (href.includes(`${LOGIN_QUERY_KASSA_CLOSE_TIP}=`)) return href
  const join = href.includes('?') ? '&' : '?'
  return `${href}${join}${LOGIN_QUERY_KASSA_CLOSE_TIP}=1`
}
