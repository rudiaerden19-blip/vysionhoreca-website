'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/i18n'
import { isTenantBlocked } from '@/lib/tenant-blocked'
import { tenantBlockedGateMode } from '@/lib/tenant-blocked-gate-mode'

const STAFF_POLL_MS = 30_000
const BLOCKED_POLL_MS = 15_000

export function TenantBlockedGate({
  tenantSlug,
  forceStaff = false,
  children,
}: {
  tenantSlug: string
  forceStaff?: boolean
  children: ReactNode
}) {
  const pathname = usePathname() || ''
  const mode = forceStaff ? 'staff' : tenantBlockedGateMode(pathname)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = () => {
      void isTenantBlocked(tenantSlug).then((b) => {
        if (!cancelled) setBlocked(b)
      })
    }
    check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', onVisible)
    const pollMs = blocked ? BLOCKED_POLL_MS : mode === 'staff' ? STAFF_POLL_MS : 0
    const timer = pollMs > 0 ? window.setInterval(check, pollMs) : null
    return () => {
      cancelled = true
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVisible)
      if (timer !== null) window.clearInterval(timer)
    }
  }, [tenantSlug, mode, blocked])

  if (blocked) return <TenantBlockedScreen mode={mode} />
  return <>{children}</>
}

function TenantBlockedScreen({ mode }: { mode: 'staff' | 'public' }) {
  const { t } = useLanguage()
  const title = mode === 'staff' ? t('adminLayout.blockedTitle') : t('shopPage.blockedTitle')
  const desc = mode === 'staff' ? t('adminLayout.blockedDesc') : t('shopPage.blockedDescription')
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4"
      role="alertdialog"
      aria-modal="true"
      data-testid="tenant-blocked-screen"
    >
      <div className="w-full max-w-lg rounded-3xl border-4 border-red-600 bg-white p-8 text-center shadow-2xl sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-3xl font-black text-white">
          !
        </div>
        <h1 className="mb-4 text-2xl font-black text-red-600 sm:text-3xl">{title}</h1>
        <p className="text-base font-semibold text-gray-800 sm:text-lg">{desc}</p>
      </div>
    </div>
  )
}
