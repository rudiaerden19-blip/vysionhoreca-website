'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { buildShopInternalReturnPath } from '@/lib/auth-headers'
import {
  SHOP_CUSTOMER_LOGOUT_CHANNEL,
  TENANT_OWNER_LOGOUT_CHANNEL,
  applyFullStaffLogoutCleanup,
  applyOwnerOnlyLogoutCleanup,
  attemptCloseCurrentWebview,
  attemptCloseThenOrNavigate,
  clearShopCustomerSessionLocal,
  readTerminalLogout,
  setTerminalLogout,
  type OwnerLogoutMessage,
} from '@/lib/session-broadcast'

/**
 * Uitloggen op één plaats: andere tabbladen mee opruimen (BroadcastChannel) + lokale „terminal logout”-
 * flag zodat het PWA-icoon geen verborgen menu/Kassa meer toont voordan opnieuw is ingelogd.
 */
export function TenantWebSessionOrchestrator({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stamp = readTerminalLogout()
    if (!stamp) return

    if (stamp.kind === 'superadmin') {
      const p = pathname || ''
      if (p.startsWith('/superadmin/login')) return
      window.location.replace(`${window.location.origin}/superadmin/login`)
      return
    }

    if (stamp.tenantSlug !== tenantSlug) return

    const p = pathname || ''

    /* staff zaak-session */
    if (p === '/login') return
    const origin = window.location.origin
    const q = window.location.search || ''
    const rawNext = `${p}${q}`
    window.location.replace(`${origin}/login?next=${encodeURIComponent(rawNext)}`)
  }, [pathname, tenantSlug])

  useEffect(() => {
    let bcCustomer: BroadcastChannel | null = null
    let bcOwner: BroadcastChannel | null = null

    try {
      bcCustomer = new BroadcastChannel(SHOP_CUSTOMER_LOGOUT_CHANNEL)
      bcCustomer.onmessage = () => {
        clearShopCustomerSessionLocal()
        attemptCloseCurrentWebview()
      }
    } catch {
      /* geen ondersteuning */
    }

    try {
      bcOwner = new BroadcastChannel(TENANT_OWNER_LOGOUT_CHANNEL)
      bcOwner.onmessage = (ev: MessageEvent) => {
        const d = ev.data as Partial<OwnerLogoutMessage>
        if (d?.type !== 'owner-logout' || typeof d.tenantSlug !== 'string') return

        if (d.landing === 'superadmin-login') setTerminalLogout({ kind: 'superadmin' })
        else setTerminalLogout({ kind: 'staff', tenantSlug: d.tenantSlug })

        if (d.scope === 'full') applyFullStaffLogoutCleanup()
        else applyOwnerOnlyLogoutCleanup(d.tenantSlug)

        const origin = window.location.origin
        if (d.landing === 'superadmin-login') {
          attemptCloseThenOrNavigate(() => {
            window.location.replace(`${origin}/superadmin/login`)
          })
          return
        }

        const search = window.location.search || ''
        const next = buildShopInternalReturnPath(d.tenantSlug, window.location.pathname, search)
        const loginUrl = `${origin}/login?next=${encodeURIComponent(next)}`
        attemptCloseThenOrNavigate(() => {
          window.location.replace(loginUrl)
        })
      }
    } catch {
      /* geen ondersteuning */
    }

    return () => {
      bcCustomer?.close()
      bcOwner?.close()
    }
  }, [tenantSlug])

  return null
}
