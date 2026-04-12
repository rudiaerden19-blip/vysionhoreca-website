import type { Metadata } from 'next'

const canonical = '/sectoren/cafe-frituur-kebab'

export const metadata: Metadata = {
  title: {
    absolute: 'Horeca Kassa voor Café, Frituur & Kebab | Vysion All-in-One',
  },
  description:
    'Razendsnel bestellen en afrekenen: i5 hardware (Het Beest), 9 talen voor meertalig personeel, volledige marge-controle. Snelste kassa, kassa kopen of proef — kassasysteem België & Nederland.',
  keywords: [
    'horeca kassa',
    'frituur kassa',
    'kebab kassa',
    'snelste kassa',
    'kassa kopen',
    'kassasysteem België',
    'online bestelplatform',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Horeca Kassa voor Café, Frituur & Kebab | Vysion All-in-One',
    description:
      'Café, frituur, kebab: i5, 9 talen, snelle checkout. Kassasysteem België — start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Horeca Kassa voor Café, Frituur & Kebab | Vysion All-in-One',
    description: 'All-in-one horeca kassa met i5 en 9 talen. Kassa kopen of gratis proberen.',
  },
}

export default function CafeFrituurKebabLayout({ children }: { children: React.ReactNode }) {
  return children
}
