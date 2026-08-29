'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-headers'
import type { KassaPaymentTerminalPublic } from '@/lib/kassa-payment-terminal'

/**
 * Lezers ophalen. Fout of lege lijst → bestaande kassa (geen wacht-op-pin).
 */
export function useKassaCloudTerminals(tenantSlug: string): KassaPaymentTerminalPublic[] {
  const [terminals, setTerminals] = useState<KassaPaymentTerminalPublic[]>([])

  useEffect(() => {
    if (!tenantSlug) return
    let cancelled = false
    void authFetch(
      `/api/kassa/payment-terminal?tenant_slug=${encodeURIComponent(tenantSlug)}`,
    )
      .then(async (res) => {
        if (!res.ok) return
        const json = (await res.json()) as {
          ok?: boolean
          terminals?: KassaPaymentTerminalPublic[]
        }
        if (!cancelled && json.ok && Array.isArray(json.terminals)) {
          setTerminals(json.terminals)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  return terminals
}
