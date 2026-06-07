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
import { clearTerminalLogout } from '@/lib/session-broadcast'

function gksPilotAuthSessionKey(tenantSlug: string): string {
  return `gks_pilot_auth_ok_${tenantSlug}`
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
    clearTerminalLogout()
    try {
      sessionStorage.setItem(gksPilotAuthSessionKey(tenantSlug), '1')
    } catch {
      /* ignore */
    }
  }

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (sessionStorage.getItem(gksPilotAuthSessionKey(tenantSlug)) === '1') {
        clearTerminalLogout()
        return
      }
    } catch {
      /* ignore */
    }
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
      clearTenantOwnerSession()
      try {
        sessionStorage.removeItem(gksPilotAuthSessionKey(tenantSlug))
      } catch {
        /* ignore */
      }
      const next = buildShopInternalReturnPath(
        tenantSlug,
        window.location.pathname,
        window.location.search || '',
      )
      window.location.assign(`${window.location.origin}/login?next=${encodeURIComponent(next)}`)
    }

    void (async () => {
      try {
        if (sessionStorage.getItem(gksPilotAuthSessionKey(tenantSlug)) === '1') {
          clearTerminalLogout()
          return
        }
      } catch {
        /* ignore */
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
