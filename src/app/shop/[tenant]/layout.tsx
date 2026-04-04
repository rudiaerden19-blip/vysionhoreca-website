import type { Viewport } from 'next'
import { getTenantSettings } from '@/lib/admin-api'
import { normalizeThemeColorHex } from '@/lib/theme-color'
import { InstallPWABanner } from '@/components/InstallPWABanner'

export async function generateViewport({
  params,
}: {
  params: { tenant: string }
}): Promise<Viewport> {
  let themeColor = '#ffffff'
  try {
    const settings = await getTenantSettings(params.tenant)
    themeColor = normalizeThemeColorHex(settings?.primary_color)
  } catch {
    /* negeren → wit */
  }

  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor,
  }
}

export default function ShopTenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InstallPWABanner />
      {children}
    </>
  )
}
