import type { Viewport } from 'next'
import type { ReactNode } from 'react'
import { TENANT_APP_SHELL_THEME_COLOR } from '@/lib/theme-color'

export async function generateViewport(): Promise<Viewport> {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    themeColor: TENANT_APP_SHELL_THEME_COLOR,
  }
}

export default function KeukenTenantLayout({ children }: { children: ReactNode }) {
  return children
}
