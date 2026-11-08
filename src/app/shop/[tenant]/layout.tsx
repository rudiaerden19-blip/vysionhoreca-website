import type { Viewport } from 'next'
import type { ReactNode } from 'react'
import { TENANT_APP_SHELL_THEME_COLOR } from '@/lib/theme-color'
import { InstallPWABanner } from '@/components/InstallPWABanner'
import { TenantWebSessionOrchestrator } from '@/components/TenantWebSessionOrchestrator'
import { TenantBlockedGate } from '@/components/TenantBlockedGate'
import { ShopAzertyOskShell } from '@/app/shop/[tenant]/ShopAzertyOskShell'
export async function generateViewport(): Promise<Viewport> {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: TENANT_APP_SHELL_THEME_COLOR,
  }
}

export default function ShopTenantLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { tenant: string }
}) {
  return (
    <>
      <TenantWebSessionOrchestrator tenantSlug={params.tenant} />
      <InstallPWABanner />
      <TenantBlockedGate tenantSlug={params.tenant}>
        <ShopAzertyOskShell>{children}</ShopAzertyOskShell>
      </TenantBlockedGate>
    </>
  )
}
