'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLanguage } from '@/i18n'
import {
  buildShopInternalReturnPath,
  isOwnerSessionFreshForTenant,
  isSuperAdminLoggedIn,
  verifyShopAdminApiSession,
} from '@/lib/auth-headers'
import { mirrorSuperadminSessionFromCookieToLocalStorage } from '@/lib/superadmin-cookies'

type GatePhase = 'checking' | 'ready' | 'redirect'

/**
 * GKS-pilot: géén gedeelde AdminLayout (tenant gate, module flags, herhaalde auth-effects).
 * Eén auth-check per tab+tenant; kinderen mounten één keer na ready.
 */
export function GksPilotLayoutGate({
  tenantSlug,
  children,
}: {
  tenantSlug: string
  children: ReactNode
}) {
  const { t } = useLanguage()
  const [phase, setPhase] = useState<GatePhase>('checking')
  const authRunFor = useRef<string | null>(null)

  useEffect(() => {
    if (authRunFor.current === tenantSlug) return
    authRunFor.current = tenantSlug

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
  }, [tenantSlug])

  if (phase === 'ready') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">
          {phase === 'redirect' ? t('adminLayout.redirectLogin') : t('adminLayout.loading')}
        </p>
      </div>
    </div>
  )
}
