import type { Metadata } from 'next'

const canonical = '/sectoren/frituur'

export const metadata: Metadata = {
  title: {
    absolute: 'Frituur Kassa | Snelste i9 Checkout | Vysion kassa',
  },
  description:
    'Frituur en snackbar: Intel i9-kassa, dubbel scherm, 9 talen, ingebouwde printer. Stop met huren. Na 24 maanden is deze i9 kassa 100% jouw eigendom. Kassasysteem België & Nederland.',
  keywords: [
    'frituur kassa',
    'snackbar kassa',
    'snelste kassa',
    'kassa kopen',
    'kassasysteem België',
    'i9 kassa',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Frituur Kassa | Snelste i9 Checkout | Vysion kassa',
    description: 'Frituur: i9, snelle kassa, online bestellen. België — start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frituur Kassa | Snelste i9 Checkout | Vysion kassa',
    description: 'Frituur POS met i9. Kassa kopen of gratis proberen.',
  },
}

export default function FrituurSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
