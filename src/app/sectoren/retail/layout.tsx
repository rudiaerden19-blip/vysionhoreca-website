import type { Metadata } from 'next'

const canonical = '/sectoren/retail'

export const metadata: Metadata = {
  title: {
    absolute: "Retail Kassa & Voorraadbeheer | Het i9 'Beest'voor Winkels | Vysion kassa",
  },
  description:
    'Winkelvoorraad op krachtige i9-kassa (16 GB RAM), touchscreen POS, gratis website-integratie. Stop met huren. Na 24 maanden is deze i9 kassa 100% jouw eigendom. Snelste retail kassa — kassasysteem België & Nederland.',
  keywords: [
    'retail kassa',
    'winkel kassa',
    'voorraad kassa',
    'snelste kassa',
    'kassa kopen',
    'kassasysteem België',
    'i9 kassa',
  ],
  alternates: { canonical },
  openGraph: {
    title: "Retail Kassa & Voorraadbeheer | Het i9 'Beest'voor Winkels | Vysion kassa",
    description: 'Retail: i9, voorraad, snelle checkout. Kassasysteem België — start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Retail Kassa & Voorraadbeheer | Het i9 'Beest'voor Winkels | Vysion kassa",
    description: 'Retail POS met i9. Kassa kopen of proef — België & Nederland.',
  },
}

export default function RetailSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
