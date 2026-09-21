import type { Metadata } from 'next'

const canonical = '/sectoren/bakkerij'

export const metadata: Metadata = {
  title: {
    absolute: 'Snelste Kassasysteem voor Bakkers | i9 Kracht & 9 Talen | Vysion kassa',
  },
  description:
    'Specifieke kassa-layout voor bakkers: Intel i9 (Het Beest) voor ochtenddrukte, 9 talen. Snelste kassa — kassasysteem België & Nederland.',
  keywords: [
    'bakkerij kassa',
    'snelste kassa',
    'kassa kopen',
    'kassasysteem België',
    'i9 kassa',
    'kassa',
    'gratis kassa proberen',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Snelste Kassasysteem voor Bakkers | i9 Kracht & 9 Talen | Vysion kassa',
    description:
      'Bakkers: i9-kracht, 9 talen. Kassasysteem België — start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snelste Kassasysteem voor Bakkers | i9 Kracht & 9 Talen | Vysion kassa',
    description:
      'Kassa-layout voor bakkers: i9, 9 talen. Kassasysteem België.',
  },
}

export default function BakkerijSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
