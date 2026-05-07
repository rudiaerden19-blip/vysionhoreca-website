import type { Metadata } from 'next'

const canonical = '/sectoren/retail'

export const metadata: Metadata = {
  title: {
    absolute: "Retail Kassa & Voorraadbeheer | Het i7 'Beest' voor Winkels | Vysion",
  },
  description:
    'Winkelvoorraad op krachtige i7-kassa (16 GB RAM), touchscreen POS, gratis website-integratie. Stop met huren. Na 24 maanden is deze i7 kassa 100% jouw eigendom. Snelste retail kassa — kassasysteem België & Nederland.',
  keywords: [
    'retail kassa',
    'winkel kassa',
    'voorraad kassa',
    'snelste kassa',
    'kassa kopen',
    'kassasysteem België',
    'i7 kassa',
  ],
  alternates: { canonical },
  openGraph: {
    title: "Retail Kassa & Voorraadbeheer | Het i7 'Beest' voor Winkels | Vysion",
    description: 'Retail: i7, voorraad, snelle checkout. Kassasysteem België — start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Retail Kassa & Voorraadbeheer | Het i7 'Beest' voor Winkels | Vysion",
    description: 'Retail POS met i7. Kassa kopen of proef — België & Nederland.',
  },
}

export default function RetailSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
