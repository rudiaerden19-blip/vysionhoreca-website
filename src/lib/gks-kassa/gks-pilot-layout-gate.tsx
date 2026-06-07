'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  buildShopInternalReturnPath,
  clearTenantOwnerSession,
  isOwnerSessionFreshForTenant,
  isSuperAdminLoggedIn,
  verifyShopAdminApiSession,
} from '@/lib/auth-headers'
import { mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'
import { readTerminalLogout, setTerminalLogout } from '@/lib/session-broadcast'

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

/** Uitlog-stempel of platform-stempel: geen kassa tonen vóór login. */
function blocksGksAccessBeforeRender(tenantSlug: string): boolean {
  const term = readTerminalLogout()
  if (!term) return false
  if (term.kind === 'superadmin') return true
  if (term.kind === 'staff' && term.tenantSlug === tenantSlug) return true
  return false
}

function pilotAuthCacheAllowsSkip(tenantSlug: string): boolean {
  if (blocksGksAccessBeforeRender(tenantSlug)) return false
  try {
    return sessionStorage.getItem(gksPilotAuthSessionKey(tenantSlug)) === '1'
  } catch {
    return false
  }
}

/**
 * GKS-pilot: POS pas tonen na bevestigde sessie (geen flits kassa → login).
 */
export function GksPilotLayoutGate({
  tenantSlug,
  children,
}: {
  tenantSlug: string
  children: ReactNode
}) {
  const [access, setAccess] = useState<'checking' | 'granted'>('checking')
  const redirectingRef = useRef(false)
  const verifyGenRef = useRef(0)

  const markPilotAuthOk = () => {
    try {
      sessionStorage.setItem(gksPilotAuthSessionKey(tenantSlug), '1')
    } catch {
      /* ignore */
    }
  }

  const goLogin = () => {
    if (redirectingRef.current) return
    redirectingRef.current = true
    setAccess('checking')
    clearGksPilotAuthSession(tenantSlug)
    clearTenantOwnerSession()
    const term = readTerminalLogout()
    if (term?.kind === 'superadmin') {
      setTerminalLogout({ kind: 'staff', tenantSlug })
    }
    const next = buildShopInternalReturnPath(
      tenantSlug,
      window.location.pathname,
      window.location.search || '',
    )
    window.location.assign(`${window.location.origin}/login?next=${encodeURIComponent(next)}`)
  }

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    setAccess('checking')
    redirectingRef.current = false
    verifyGenRef.current += 1

    if (blocksGksAccessBeforeRender(tenantSlug)) {
      clearGksPilotAuthSession(tenantSlug)
      goLogin()
      return
    }

    if (pilotAuthCacheAllowsSkip(tenantSlug)) {
      setAccess('granted')
      return
    }

    mirrorSuperadminSessionFromCookieToLocalStorage()
    if (isSuperAdminLoggedIn()) {
      markPilotAuthOk()
      setAccess('granted')
    }
  }, [tenantSlug])

  useEffect(() => {
    const gen = ++verifyGenRef.current
    let cancelled = false

    void (async () => {
      if (blocksGksAccessBeforeRender(tenantSlug)) {
        if (gen !== verifyGenRef.current || cancelled) return
        goLogin()
        return
      }

      if (pilotAuthCacheAllowsSkip(tenantSlug)) {
        if (gen !== verifyGenRef.current || cancelled) return
        setAccess('granted')
        return
      }

      mirrorSuperadminSessionFromCookieToLocalStorage()

      if (isSuperAdminLoggedIn()) {
        if (gen !== verifyGenRef.current || cancelled) return
        markPilotAuthOk()
        setAccess('granted')
        return
      }

      if (isOwnerSessionFreshForTenant(tenantSlug)) {
        let outcome = await verifyShopAdminApiSession(tenantSlug)
        if (gen !== verifyGenRef.current || cancelled) return
        if (outcome === 'ok' || outcome === 'network_error') {
          markPilotAuthOk()
          setAccess('granted')
          return
        }
        await new Promise((r) => setTimeout(r, 400))
        if (gen !== verifyGenRef.current || cancelled) return
        mirrorSuperadminSessionFromCookieToLocalStorage()
        outcome = await verifyShopAdminApiSession(tenantSlug)
        if (gen !== verifyGenRef.current || cancelled) return
        if (outcome === 'ok' || outcome === 'network_error') {
          markPilotAuthOk()
          setAccess('granted')
          return
        }
        clearTenantOwnerSession()
      }

      if (gen !== verifyGenRef.current || cancelled) return
      goLogin()
    })()

    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  if (access !== 'granted') {
    return null
  }

  return <>{children}</>
}
