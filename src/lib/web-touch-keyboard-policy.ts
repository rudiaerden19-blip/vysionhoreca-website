/**
 * Wanneer het Vysion-schermtoetsenbord actief is vs. het native OS-toetsenbord.
 *
 * - Kassa / admin / keuken / kiosk-bestellen: schermtoetsenbord (touch-pc).
 * - Telefoon bij online bestellen, account, reserveren: native toetsenbord.
 */

import { KIOSK_COOKIE } from '@/lib/kiosk-mode'

export function isKioskSession(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${KIOSK_COOKIE}=([^;]*)`))
    const v = match?.[1]?.toLowerCase()?.trim()
    if (v === '1' || v === 'true') return true
  } catch {
    /* noop */
  }
  try {
    const p = window.location.pathname.replace(/\/+$/, '') || '/'
    if (p === '/kiosk1' || /\/kiosk1$/i.test(p)) return true
  } catch {
    /* noop */
  }
  return false
}

/** Smalle telefoon (geen kiosk-tablet / geen iPad als tablet). */
export function isPhoneLikeDevice(): boolean {
  if (typeof window === 'undefined') return false
  if (isKioskSession()) return false

  try {
    if (localStorage.getItem('vysion_web_kb_force') === '1') return false
  } catch {
    /* noop */
  }

  const ua = navigator.userAgent || ''
  const maxTouch = navigator.maxTouchPoints ?? 0
  const ipadLike = /iPad/i.test(ua) || (/\bMacintosh\b/i.test(ua) && maxTouch > 1)
  if (ipadLike) return false

  if (/Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini/i.test(ua)) {
    return true
  }

  try {
    const narrow = window.matchMedia('(max-width: 480px)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (narrow && coarse) return true
  } catch {
    /* noop */
  }

  return false
}

export function isShopStaffInternalPath(pathname: string): boolean {
  const p = pathname || ''
  return (
    /^\/shop\/[^/]+\/admin(\/|$)/i.test(p) ||
    /^\/shop\/[^/]+\/display(\/|$)/i.test(p) ||
    /^\/shop\/[^/]+\/klantscherm(\/|$)/i.test(p)
  )
}

/** Klantflows: bestellen, account, reserveren (niet admin/kassa). */
export function isShopCustomerSelfServicePath(pathname: string): boolean {
  const p = (pathname || '').replace(/\/+$/, '') || '/'
  if (isShopStaffInternalPath(p)) return false

  if (/^\/shop\/[^/]+$/i.test(p)) return true

  if (!/^\/shop\/[^/]+\//i.test(p)) return false

  const rest = p.replace(/^\/shop\/[^/]+/i, '') || '/'
  return /^\/(checkout|menu|account|reserveren|review|winkelpas|groep|menukaart|welkom)(\/|$)/i.test(rest)
}

/** Tenant-subdomein zonder /shop/… in URL (kiosk). */
export function isShortCustomerSelfServicePath(pathname: string): boolean {
  const p = (pathname || '').replace(/\/+$/, '') || '/'
  if (p === '/') return true
  return /^\/(checkout|menu|account|kiosk1)(\/|$)/i.test(p)
}

export function preferNativeKeyboardOnThisPage(pathname: string): boolean {
  if (typeof window === 'undefined') return false
  if (isKioskSession()) return false
  if (!isPhoneLikeDevice()) return false

  const p = pathname || window.location.pathname
  return isShopCustomerSelfServicePath(p) || isShortCustomerSelfServicePath(p)
}
