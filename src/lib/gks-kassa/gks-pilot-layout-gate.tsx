'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import {
  buildShopInternalReturnPath,
  clearTenantOwnerSession,
  isOwnerSessionFreshForTenant,
  isSuperAdminLoggedIn,
  verifyShopAdminApiSession,
} from '@/lib/auth-headers'
import { mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'

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
          return
        }
      } catch {
        /* ignore */
      }

      mirrorSuperadminSessionFromCookieToLocalStorage()

      if (isSuperAdminLoggedIn()) {
        try {
          sessionStorage.setItem(gksPilotAuthSessionKey(tenantSlug), '1')
        } catch {
          /* ignore */
        }
        return
      }

      if (isOwnerSessionFreshForTenant(tenantSlug)) {
        const outcome = await verifyShopAdminApiSession(tenantSlug)
        if (cancelled) return
        if (outcome === 'ok' || outcome === 'network_error') {
          try {
            sessionStorage.setItem(gksPilotAuthSessionKey(tenantSlug), '1')
          } catch {
            /* ignore */
          }
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
