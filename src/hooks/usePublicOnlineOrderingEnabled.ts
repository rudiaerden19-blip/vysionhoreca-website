'use client'

import { useEffect, useState } from 'react'
import { fetchPublicOnlineOrderingEnabled } from '@/lib/tenant-public-online-ordering'

/** `null` = nog laden; `false` = geen webshop-module. */
export function usePublicOnlineOrderingEnabled(tenantSlug: string): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    setEnabled(null)
    fetchPublicOnlineOrderingEnabled(tenantSlug).then((on) => {
      if (!cancelled) setEnabled(on)
    })
    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  return enabled
}
