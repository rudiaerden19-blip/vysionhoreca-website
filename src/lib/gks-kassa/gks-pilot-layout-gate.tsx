'use client'

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import {
  buildShopInternalReturnPath,
  clearTenantOwnerSession,
  isOwnerSessionFreshForTenant,
  isSuperAdminLoggedIn,
  verifyShopAdminApiSession,
} from '@/lib/auth-headers'
import { mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'
import { readTerminalLogout } from '@/lib/session-broadcast'

export function gksPilotAuthSessionKey(tenantSlug: string): string {
  return `gks_pilot_auth_ok_${tenantSlug}`
}

export function clearGksPilotAuthSession(tenantSlug: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(gksPilotAuthSessionKey(tenantSlug))
  } catch {
    /* ignore */
  }
}

function terminalLogoutBlocksPilotCache(tenantSlug: string): boolean {
  const term = readTerminalLogout()
  if (!term) return false
  if (term.kind === 'superadmin') return true
  if (term.kind === 'staff' && term.tenantSlug === tenantSlug) return true
  return false
}

function pilotAuthCacheAllowsSkip(tenantSlug: string): boolean {
  if (terminalLogoutBlocksPilotCache(tenantSlug)) return false
  try {
    return sessionStorage.getItem(gksPilotAuthSessionKey(tenantSlug)) === '1'
  } catch {
    return false
  }
}

/**
 * GKS-pilot: geen overlay/spinner — POS blijft zichtbaar; bij geen sessie → login redirect.
 */
export function GksPilotLayoutGate({
  tenantSlug,
  children,
}: {
  tenantSlug: string
  children: ReactNode
}) {
  const authCheckTenantRef = useRef<string | null>(null)
  const redirectingRef = useRef(false)

  const markPilotAuthOk = () => {
    try {
      sessionStorage.setItem(gksPilotAuthSessionKey(tenantSlug), '1')
    } catch {
      /* ignore */
    }
  }

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (terminalLogoutBlocksPilotCache(tenantSlug)) {
      clearGksPilotAuthSession(tenantSlug)
      return
    }
    if (pilotAuthCacheAllowsSkip(tenantSlug)) return
    mirrorSuperadminSessionFromCookieToLocalStorage()
    if (isSuperAdminLoggedIn()) {
      markPilotAuthOk()
    }
  }, [tenantSlug])

  useEffect(() => {
    if (authCheckTenantRef.current === tenantSlug) return
    authCheckTenantRef.current = tenantSlug

    let cancelled = false

    const goLogin = () => {
      if (cancelled || redirectingRef.current) return
      redirectingRef.current = true
      clearGksPilotAuthSession(tenantSlug)
      clearTenantOwnerSession()
      const next = buildShopInternalReturnPath(
        tenantSlug,
        window.location.pathname,
        window.location.search || '',
      )
      window.location.assign(`${window.location.origin}/login?next=${encodeURIComponent(next)}`)
    }

    void (async () => {
      if (terminalLogoutBlocksPilotCache(tenantSlug)) {
        clearGksPilotAuthSession(tenantSlug)
        goLogin()
        return
      }

      if (pilotAuthCacheAllowsSkip(tenantSlug)) {
        return
      }

      mirrorSuperadminSessionFromCookieToLocalStorage()

      if (isSuperAdminLoggedIn()) {
        markPilotAuthOk()
        return
      }

      if (isOwnerSessionFreshForTenant(tenantSlug)) {
        let outcome = await verifyShopAdminApiSession(tenantSlug)
        if (cancelled) return
        if (outcome === 'ok' || outcome === 'network_error') {
          markPilotAuthOk()
          return
        }
        await new Promise((r) => setTimeout(r, 400))
        if (cancelled) return
        mirrorSuperadminSessionFromCookieToLocalStorage()
        outcome = await verifyShopAdminApiSession(tenantSlug)
        if (cancelled) return
        if (outcome === 'ok' || outcome === 'network_error') {
          markPilotAuthOk()
          return
        }
        clearTenantOwnerSession()
      }

      goLogin()
    })()

    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  return <>{children}</>
}
