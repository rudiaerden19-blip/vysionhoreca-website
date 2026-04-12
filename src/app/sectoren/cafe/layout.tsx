import type { Metadata } from 'next'

const canonical = '/sectoren/cafe'

export const metadata: Metadata = {
  title: {
    absolute: 'Horeca Kassa voor Cafés | i5 Dual-Screen & 9 Talen | Vysion',
  },
  description:
    'Café: razendsnelle i5-kassa (Het Beest), 9 talen, dubbel scherm, na 24 maanden eigendom. Stop met huren. Na 24 maanden is deze i5 kassa 100% jouw eigendom. Snelste horeca kassa — kassasysteem België & Nederland.',
  keywords: [
    'horeca kassa',
    'café kassa',
    'snelste kassa',
    'kassa kopen',
    'kassasysteem België',
    'i5 kassa',
    'online bestellen',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Horeca Kassa voor Cafés | i5 Dual-Screen & 9 Talen | Vysion',
    description:
      'Café: i5, 9 talen, snelle checkout. Kassasysteem België — start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Horeca Kassa voor Cafés | i5 Dual-Screen & 9 Talen | Vysion',
    description: 'Café POS met i5 en 9 talen. Gratis proberen — België & Nederland.',
  },
}

export default function CafeSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
