'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useLanguage } from '@/i18n'
import {
  buildShopInternalReturnPath,
  isOwnerSessionFreshForTenant,
  isSuperAdminLoggedIn,
  verifyShopAdminApiSession,
} from '@/lib/auth-headers'
import { mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'

type GatePhase = 'checking' | 'ready' | 'redirect'

function gksPilotAuthSessionKey(tenantSlug: string): string {
  return `gks_pilot_auth_ok_${tenantSlug}`
}

/**
 * GKS-pilot: één auth-check; POS blijft gemount (geen swap spinner ↔ kassa).
 */
export function GksPilotLayoutGate({
  tenantSlug,
  children,
}: {
  tenantSlug: string
  children: ReactNode
}) {
  const { t } = useLanguage()
  const [phase, setPhase] = useState<GatePhase>(() => {
    if (typeof window === 'undefined') return 'checking'
    try {
      return sessionStorage.getItem(gksPilotAuthSessionKey(tenantSlug)) === '1' ? 'ready' : 'checking'
    } catch {
      return 'checking'
    }
  })

  useEffect(() => {
    if (phase === 'ready') return

    let cancelled = false

    const goLogin = () => {
      if (cancelled) return
      setPhase('redirect')
      const next = buildShopInternalReturnPath(
        tenantSlug,
        window.location.pathname,
        window.location.search || '',
      )
      window.location.assign(`${window.location.origin}/login?next=${encodeURIComponent(next)}`)
    }

    const finishReady = () => {
      if (cancelled) return
      try {
        sessionStorage.setItem(gksPilotAuthSessionKey(tenantSlug), '1')
      } catch {
        /* ignore */
      }
      setPhase('ready')
    }

    void (async () => {
      mirrorSuperadminSessionFromCookieToLocalStorage()

      if (isSuperAdminLoggedIn()) {
        finishReady()
        return
      }

      if (isOwnerSessionFreshForTenant(tenantSlug)) {
        const outcome = await verifyShopAdminApiSession(tenantSlug)
        if (cancelled) return
        if (outcome === 'ok' || outcome === 'network_error') {
          finishReady()
          return
        }
      }

      goLogin()
    })()

    return () => {
      cancelled = true
    }
  }, [tenantSlug, phase])

  const blockInteraction = phase !== 'ready'

  return (
    <>
      <div
        className={blockInteraction ? 'pointer-events-none select-none' : undefined}
        aria-hidden={blockInteraction}
      >
        {children}
      </div>
      {blockInteraction ? (
        <div className="fixed inset-0 z-[500] flex min-h-screen items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">
              {phase === 'redirect' ? t('adminLayout.redirectLogin') : t('adminLayout.loading')}
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
