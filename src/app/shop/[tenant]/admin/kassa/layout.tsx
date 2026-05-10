/**
 * Kassa moet altijd verse shell/fetch krijgen — voorkomt dat CDN/browser + SW
 * oude HTML tonen terwijl andere werkstations al de nieuwe bundle hebben.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminKassaLayout({ children }: { children: React.ReactNode }) {
  return children
}
