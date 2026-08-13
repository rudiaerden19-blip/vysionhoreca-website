import type { Metadata } from 'next'

const canonical = '/sectoren/kapper'

export const metadata: Metadata = {
  title: {
    absolute: 'Kassasysteem voor Kappers & Salons | Stijlvol & Snel | Vysion kassa',
  },
  description:
    'Salon-upgrade: professionele i9-kassa (Het Beest), eenvoudig afrekenen, 9 talen, na 24 maanden hardware van jou. Stop met huren. Na 24 maanden is deze i9 kassa 100% jouw eigendom. Snelste kassa voor salons — kassasysteem België & Nederland.',
  keywords: [
    'kapper kassa',
    'salon kassa',
    'snelste kassa',
    'kassa kopen',
    'kassasysteem België',
    'i9 kassa',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Kassasysteem voor Kappers & Salons | Stijlvol & Snel | Vysion kassa',
    description: 'Kappers & salons: i9, stijlvolle checkout, eigendom na 24 maanden.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kassasysteem voor Kappers & Salons | Stijlvol & Snel | Vysion kassa',
    description: 'Salon POS met i9-kracht. Kassasysteem België — probeer gratis.',
  },
}

export default function KapperSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
