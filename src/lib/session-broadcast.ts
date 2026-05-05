import { clearTenantOwnerSession } from '@/lib/auth-headers'
import { clearSuperadminSessionCookies } from '@/lib/superadmin-cookies'

/** Andere tabbladen / webviews op zelfde origin — zelf gedrag bij uitloggen klant */
export const SHOP_CUSTOMER_LOGOUT_CHANNEL = 'vysion-shop-customer-logout-v1'

/** Zaak/medewerker-uitloggen (kassa-, admin-accountmenu) — alle open schermen mee opruimen */
export const TENANT_OWNER_LOGOUT_CHANNEL = 'vysion-tenant-owner-logout-v1'

const TERMINAL_LOGOUT_KEY = 'vysion_terminal_logout_v3'

export type OwnerLogoutLanding = 'tenant-login' | 'superadmin-login'

export type OwnerLogoutMessage = {
  type: 'owner-logout'
  scope: 'owner' | 'full'
  tenantSlug: string
  landing: OwnerLogoutLanding
  ts: number
}

/** Na uitloggen (alleen zaak/superadmin): volgende URL’s dwingen naar inlog tot opnieuw sessie. Klant-uitlog: geen stempel — elk tabblad probeert zich te sluiten (browser beperkt dit). */
export type TerminalLogoutStamp = { kind: 'staff'; tenantSlug: string } | { kind: 'superadmin' }

export function setTerminalLogout(stamp: TerminalLogoutStamp): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TERMINAL_LOGOUT_KEY, JSON.stringify(stamp))
  } catch {
    /* private mode */
  }
}

export function clearTerminalLogout(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(TERMINAL_LOGOUT_KEY)
  } catch {
    /* ignore */
  }
}

export function readTerminalLogout(): TerminalLogoutStamp | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(TERMINAL_LOGOUT_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { kind?: string; tenantSlug?: string }
    const kind = o?.kind
    if (kind === 'superadmin') return { kind: 'superadmin' }
    if (kind === 'staff' && typeof o.tenantSlug === 'string' && o.tenantSlug.trim()) {
      return { kind: 'staff', tenantSlug: o.tenantSlug }
    }
    if (kind === 'customer') {
      try {
        localStorage.removeItem(TERMINAL_LOGOUT_KEY)
      } catch {
        /* ignore */
      }
      return null
    }
    return null
  } catch {
    return null
  }
}

/** Verwijdert lokale klant-sessie + winkelmand(ken) voor de webshop. */
export function clearShopCustomerSessionLocal(): void {
  if (typeof window === 'undefined') return
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (k.startsWith('customer_') || k.startsWith('cart_')) toRemove.push(k)
    }
    toRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    /* private mode */
  }
}

/**
 * `window.close()` mag alleen bij door script geopende vensters; veel tabbladen/PWA’s weigeren dit.
 * Wordt op elke klant-uitlog-broadcast aangeroepen zodat elk open tabblad zichzelf sluit **als** de browser het toelaat.
 */
export function attemptCloseCurrentWebview(): void {
  if (typeof window === 'undefined') return
  try {
    window.close()
  } catch {
    /* Safari/Chrome kunnen blokkeren */
  }
}


export type CustomerLogoutMessage = { type: 'customer-logout'; tenantSlug: string; ts: number }

export function broadcastShopCustomerLogout(tenantSlug: string): void {
  try {
    const bc = new BroadcastChannel(SHOP_CUSTOMER_LOGOUT_CHANNEL)
    bc.postMessage({ type: 'customer-logout', tenantSlug, ts: Date.now() } satisfies CustomerLogoutMessage)
    bc.close()
  } catch {
    /* Safari ouder / geen BroadcastChannel */
  }
}

/**
 * Klant uitloggen: sessie wissen; alle open tabbladen (zelfde origin) proberen zich te sluiten.
 * Browsers/PWA’s mogen `close()` weigeren voor handmatig geopende tabbladen — dat is een platformlimiet.
 */
export function redirectCustomerLogoutUI(tenantSlug: string): void {
  if (typeof window === 'undefined') return
  broadcastShopCustomerLogout(tenantSlug)
  clearShopCustomerSessionLocal()
  attemptCloseCurrentWebview()
}

/** Superadmin + zaak-headers wissen (admin-menu «Uitloggen»). */
export function applyFullStaffLogoutCleanup(): void {
  if (typeof window === 'undefined') return
  clearTenantOwnerSession()
  try {
    localStorage.removeItem('superadmin_id')
    localStorage.removeItem('superadmin_email')
    localStorage.removeItem('superadmin_name')
    clearSuperadminSessionCookies()
    const pinKeys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith('vysion_pin_unlocked_')) pinKeys.push(k)
    }
    pinKeys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

/** Alleen zaak-eigenaars-sessie (kassa-deur zonder SA-cleanup elders). */
export function applyOwnerOnlyLogoutCleanup(tenantSlug: string): void {
  if (typeof window === 'undefined') return
  clearTenantOwnerSession()
  try {
    sessionStorage.removeItem(`vysion_pin_unlocked_${tenantSlug}`)
    sessionStorage.removeItem(`vysion_welcomed_${tenantSlug}`)
    sessionStorage.removeItem(`vysion_kassa_audio_ok_${tenantSlug}`)
    sessionStorage.removeItem(`vysion_audio_activated_${tenantSlug}`)
  } catch {
    /* ignore */
  }
}

export function broadcastTenantOwnerLogout(args: {
  scope: 'owner' | 'full'
  tenantSlug: string
  landing: OwnerLogoutLanding
}): void {
  try {
    const bc = new BroadcastChannel(TENANT_OWNER_LOGOUT_CHANNEL)
    const msg: OwnerLogoutMessage = {
      type: 'owner-logout',
      scope: args.scope,
      tenantSlug: args.tenantSlug,
      landing: args.landing,
      ts: Date.now(),
    }
    bc.postMessage(msg)
    bc.close()
  } catch {
    /* ignore */
  }
}
