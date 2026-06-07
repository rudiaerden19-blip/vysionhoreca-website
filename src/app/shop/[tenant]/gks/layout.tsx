/**
 * GKS-pilot POS — buiten /admin (geen AdminLayout).
 */
import type { Viewport } from 'next'
import type { ReactNode } from 'react'
import { GksKassaRouteLayout } from './GksKassaRouteLayout'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function GksPilotLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { tenant: string }
}) {
  return <GksKassaRouteLayout tenant={params.tenant}>{children}</GksKassaRouteLayout>
}
