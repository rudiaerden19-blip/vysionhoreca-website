'use client'

import { useLayoutEffect, useState, type ReactNode } from 'react'
import { GksPilotLayoutGate } from '@/lib/gks-kassa/gks-pilot-layout-gate'
import { ensureGksPilotFreshServiceWorker } from '@/lib/gks-kassa/gks-pwa-sw-refresh'

export function GksKassaRouteLayout({
  tenant,
  children,
}: {
  tenant: string
  children: ReactNode
}) {
  const [swReady, setSwReady] = useState(false)

  useLayoutEffect(() => {
    let cancelled = false
    void (async () => {
      const outcome = await ensureGksPilotFreshServiceWorker()
      if (cancelled) return
      if (outcome === 'reload') {
        window.location.reload()
        return
      }
      setSwReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!swReady) {
    return null
  }

  return <GksPilotLayoutGate tenantSlug={tenant}>{children}</GksPilotLayoutGate>
}
