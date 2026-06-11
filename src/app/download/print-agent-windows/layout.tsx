import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Print Agent download (Windows) | Vysion kassa",
  description:
    'Officiële Windows-installer voor bonprinten met Ordervysion. Vaste pagina op vysion-kassa.com — niet via zoekmachines.',
  alternates: {
    canonical: '/download/print-agent-windows',
  },
}

export default function PrintAgentDownloadLayout({ children }: { children: React.ReactNode }) {
  return children
}
