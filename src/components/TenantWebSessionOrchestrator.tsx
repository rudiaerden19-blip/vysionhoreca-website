'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { buildShopInternalReturnPath } from '@/lib/auth-headers'
import {
  SHOP_CUSTOMER_LOGOUT_CHANNEL,
  TENANT_OWNER_LOGOUT_CHANNEL,
  applyFullStaffLogoutCleanup,
  applyOwnerOnlyLogoutCleanup,
  clearShopCustomerSessionLocal,
  readTerminalLogout,
  setTerminalLogout,
  type CustomerLogoutMessage,
  type OwnerLogoutMessage,
} from '@/lib/session-broadcast'
import { getTenantUrl } from '@/lib/tenant-url'

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

    if (stamp.kind === 'customer') {
      if (p === `/shop/${tenantSlug}/account/login` || p.endsWith('/account/login')) return
      const path = getTenantUrl(tenantSlug, '/account/login')
      window.location.replace(`${window.location.origin}${path.startsWith('/') ? path : '/'}`)
      return
    }

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
      bcCustomer.onmessage = (ev: MessageEvent) => {
        const slug =
          typeof (ev.data as CustomerLogoutMessage | undefined)?.tenantSlug === 'string'
            ? (ev.data as CustomerLogoutMessage).tenantSlug
            : tenantSlug

        setTerminalLogout({ kind: 'customer', tenantSlug: slug })
        clearShopCustomerSessionLocal()

        const origin = window.location.origin
        const path = getTenantUrl(slug, '/account/login')
        window.location.replace(`${origin}${path.startsWith('/') ? path : '/'}`)
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
          window.location.replace(`${origin}/superadmin/login`)
          return
        }

        const search = window.location.search || ''
        const next = buildShopInternalReturnPath(d.tenantSlug, window.location.pathname, search)
        window.location.replace(`${origin}/login?next=${encodeURIComponent(next)}`)
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
