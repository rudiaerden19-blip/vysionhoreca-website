import type { Metadata } from 'next'

const canonical = '/sectoren/retail'

export const metadata: Metadata = {
  title: {
    absolute: "Retail Kassa & Voorraadbeheer | Het i5 'Beest' voor Winkels | Vysion",
  },
  description:
    'Winkelvoorraad op krachtige i5-kassa (8 GB RAM), touchscreen POS, gratis website-integratie. Snelste retail kassa — kassa kopen, kassasysteem België & Nederland, eigendom na 24 maanden.',
  keywords: [
    'retail kassa',
    'winkel kassa',
    'voorraad kassa',
    'snelste kassa',
    'kassa kopen',
    'kassasysteem België',
    'i5 kassa',
  ],
  alternates: { canonical },
  openGraph: {
    title: "Retail Kassa & Voorraadbeheer | Het i5 'Beest' voor Winkels | Vysion",
    description: 'Retail: i5, voorraad, snelle checkout. Kassasysteem België — start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Retail Kassa & Voorraadbeheer | Het i5 'Beest' voor Winkels | Vysion",
    description: 'Retail POS met i5. Kassa kopen of proef — België & Nederland.',
  },
}

export default function RetailSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
