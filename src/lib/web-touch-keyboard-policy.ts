/**
 * Eén bron van waarheid: wanneer het Vysion-schermtoetsenbord actief is.
 *
 * | Context | Toetsenbord |
 * |---------|-------------|
 * | Touch-pc: kassa, admin, keuken, /registreer, /login | Vysion (inputmode=none) |
 * | Telefoon: webshop klant (menu, checkout, account) | Native OS |
 * | Desktop zonder touch | Geen schermtoetsenbord (fysiek toetsenbord) |
 *
 * Tenant override via kassa_pos_state.touch_ui_prefs: kb_off, kb_force.
 */

import { KIOSK_COOKIE } from '@/lib/kiosk-mode'
import { getCachedTouchUiPrefs, touchPrefsTenantFromPathname } from '@/lib/touch-keyboard-prefs'

export function normalizeAppPathname(pathname: string): string {
  return (pathname || '').replace(/\/+$/, '') || '/'
}

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
    const p = normalizeAppPathname(window.location.pathname)
    if (p === '/kiosk1' || /\/kiosk1$/i.test(p)) return true
  } catch {
    /* noop */
  }
  return false
}

/** Touchscreen of tablet — geen “alleen muis” desktop. */
export function isTouchCapableDevice(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return true
  } catch {
    /* noop */
  }
  return (navigator.maxTouchPoints ?? 0) > 0
}

/** Smalle telefoon (geen kiosk-tablet / geen iPad als tablet). */
export function isPhoneLikeDevice(): boolean {
  if (typeof window === 'undefined') return false
  if (isKioskSession()) return false

  try {
    const slug = touchPrefsTenantFromPathname(window.location.pathname)
    if (slug && getCachedTouchUiPrefs(slug).kb_force) return false
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
  const p = normalizeAppPathname(pathname)
  if (isShopStaffInternalPath(p)) return false

  if (/^\/shop\/[^/]+$/i.test(p)) return true

  if (!/^\/shop\/[^/]+\//i.test(p)) return false

  const rest = p.replace(/^\/shop\/[^/]+/i, '') || '/'
  return /^\/(checkout|menu|account|reserveren|review|winkelpas|groep|menukaart|welkom)(\/|$)/i.test(rest)
}

/** Tenant-subdomein zonder /shop/… in URL (kiosk). */
export function isShortCustomerSelfServicePath(pathname: string): boolean {
  const p = normalizeAppPathname(pathname)
  if (p === '/') return true
  return /^\/(checkout|menu|account|kiosk1)(\/|$)/i.test(p)
}

/** Platform registratie / zaak-login (geen /shop/… tenant in URL). */
export function isMarketingWebKeyboardPath(pathname: string): boolean {
  const p = normalizeAppPathname(pathname)
  if (p === '/registreer' || p === '/login') return true
  return /^\/login\//i.test(p)
}

/** Telefoon + webshop-klant → native OS-toetsenbord. */
export function preferNativeKeyboardOnThisPage(pathname: string): boolean {
  if (typeof window === 'undefined') return false
  if (isKioskSession()) return false
  if (!isPhoneLikeDevice()) return false

  const p = pathname || window.location.pathname
  return isShopCustomerSelfServicePath(p) || isShortCustomerSelfServicePath(p)
}

/**
 * Moet WebAzertyKeyboard actief zijn op dit pad + apparaat?
 * (Component toont panel pas na focus op een invoerveld.)
 */
export function resolveWebKeyboardActive(pathname: string): boolean {
  if (typeof window === 'undefined') return false

  const p = pathname || window.location.pathname

  if (preferNativeKeyboardOnThisPage(p)) return false

  const tenantSlug = touchPrefsTenantFromPathname(p)
  if (tenantSlug) {
    const prefs = getCachedTouchUiPrefs(tenantSlug)
    if (prefs.kb_off) return false
    if (prefs.kb_force) return true
  }

  if (!isTouchCapableDevice()) return false

  if (isMarketingWebKeyboardPath(p)) return true
  if (isShopStaffInternalPath(p)) return true
  if (/^\/shop\/[^/]+(\/|$)/i.test(p)) return true
  if (/^\/keuken\//i.test(p)) return true
  if (/^\/(?:superadmin|dashboard)\b/i.test(p)) return true

  return true
}
