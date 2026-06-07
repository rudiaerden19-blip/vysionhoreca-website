/**
 * GKS-kassa layout (zelfde viewport/shell-gedrag als /admin/kassa).
 * Kassa moet altijd verse shell/fetch krijgen — voorkomt dat CDN/browser + SW
 * oude HTML tonen terwijl andere werkstations al de nieuwe bundle hebben.
 */
import type { Viewport } from 'next'
import type { ReactNode } from 'react'
import { GksKassaRouteLayout } from './GksKassaRouteLayout'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Volscherm-POS / embedded browsers (o.a. Elo): minder pinch-zoom → minder touch→click-vertraging dan maximumScale 5 op rest van site. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function AdminKassaLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { tenant: string }
}) {
  return <GksKassaRouteLayout tenant={params.tenant}>{children}</GksKassaRouteLayout>
}
