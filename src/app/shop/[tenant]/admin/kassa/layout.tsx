/**
 * Kassa moet altijd verse shell/fetch krijgen — voorkomt dat CDN/browser + SW
 * oude HTML tonen terwijl andere werkstations al de nieuwe bundle hebben.
 */
import type { Viewport } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Volscherm-POS / embedded browsers (o.a. Elo): minder pinch-zoom → minder touch→click-vertraging dan maximumScale 5 op rest van site. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function AdminKassaLayout({ children }: { children: React.ReactNode }) {
  return children
}
