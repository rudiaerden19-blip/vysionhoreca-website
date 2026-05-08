import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Print Agent download (Windows) | Vysion Horeca',
  description:
    'Officiële Windows-installer voor bonprinten met Ordervysion. Vaste pagina op vysionhoreca.com — niet via zoekmachines.',
  alternates: {
    canonical: '/download/print-agent-windows',
  },
}

export default function PrintAgentDownloadLayout({ children }: { children: React.ReactNode }) {
  return children
}
