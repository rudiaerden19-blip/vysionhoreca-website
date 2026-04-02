'use client'

import { useLayoutEffect } from 'react'
import { isMarketingDemoTenantSlug, persistPublicDemoSessionIfNeeded } from '@/lib/demo-links'

/** Zet demo-sessie als shop-URL `?demo=bekijk` heeft (zelfde tab → admin zonder verloren query). */
export function MarketingDemoSessionPrime({ tenant }: { tenant: string }) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !isMarketingDemoTenantSlug(tenant)) return
    persistPublicDemoSessionIfNeeded(tenant, window.location.search)
  }, [tenant])
  return null
}
