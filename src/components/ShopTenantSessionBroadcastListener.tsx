'use client'

import { useEffect } from 'react'
import { buildShopInternalReturnPath } from '@/lib/auth-headers'
import {
  SHOP_CUSTOMER_LOGOUT_CHANNEL,
  TENANT_OWNER_LOGOUT_CHANNEL,
  applyFullStaffLogoutCleanup,
  applyOwnerOnlyLogoutCleanup,
  clearShopCustomerSessionLocal,
  type OwnerLogoutMessage,
} from '@/lib/session-broadcast'
import { getTenantUrl } from '@/lib/tenant-url'

/**
 * Zorgt dat uitloggen in één tabblad andere open tabbladen / PWA-contexten naar shop-home of login jaagt,
 * én lokale sessie opruimt — webapps kunnen geen echte proces-afsluiting forceren.
 */
export function ShopTenantSessionBroadcastListener({ tenantSlug }: { tenantSlug: string }) {
  useEffect(() => {
    let bcCustomer: BroadcastChannel | null = null
    let bcOwner: BroadcastChannel | null = null

    try {
      bcCustomer = new BroadcastChannel(SHOP_CUSTOMER_LOGOUT_CHANNEL)
      bcCustomer.onmessage = () => {
        clearShopCustomerSessionLocal()
        const path = window.location.pathname
        if (path.startsWith(`/shop/${tenantSlug}/admin`) || path.startsWith('/admin')) {
          return
        }
        const home = getTenantUrl(tenantSlug, '/')
        window.location.replace(home.startsWith('/') ? home : '/')
      }
    } catch {
      /* geen ondersteuning */
    }

    try {
      bcOwner = new BroadcastChannel(TENANT_OWNER_LOGOUT_CHANNEL)
      bcOwner.onmessage = (ev: MessageEvent) => {
        const d = ev.data as Partial<OwnerLogoutMessage>
        if (d?.type !== 'owner-logout' || typeof d.tenantSlug !== 'string') return

        if (d.scope === 'full') applyFullStaffLogoutCleanup()
        else applyOwnerOnlyLogoutCleanup(d.tenantSlug)

        const origin = window.location.origin
        if (d.landing === 'superadmin-login') {
          window.location.replace(`${origin}/superadmin/login`)
          return
        }

        const search = window.location.search || ''
        const next = buildShopInternalReturnPath(tenantSlug, window.location.pathname, search)
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
