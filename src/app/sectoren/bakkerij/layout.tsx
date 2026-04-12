import type { Metadata } from 'next'

const canonical = '/sectoren/bakkerij'

export const metadata: Metadata = {
  title: {
    absolute: 'Snelste Kassasysteem voor Bakkers | i5 Kracht & 9 Talen | Vysion',
  },
  description:
    'Specifieke kassa-layout voor bakkers: Intel i5 (Het Beest) voor ochtenddrukte, 9 talen, na 24 maanden eigendom van hardware. Snelste kassa, kassa kopen of proef — kassasysteem België & Nederland.',
  keywords: [
    'bakkerij kassa',
    'snelste kassa',
    'kassa kopen',
    'kassasysteem België',
    'i5 kassa',
    'horeca kassa',
    'gratis kassa proberen',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Snelste Kassasysteem voor Bakkers | i5 Kracht & 9 Talen | Vysion',
    description:
      'Bakkers: i5-kracht, 9 talen, eigendom na 24 maanden. Kassasysteem België — start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snelste Kassasysteem voor Bakkers | i5 Kracht & 9 Talen | Vysion',
    description:
      'Kassa-layout voor bakkers: i5, 9 talen, eigendom na 24 maanden. Kassasysteem België.',
  },
}

export default function BakkerijSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
