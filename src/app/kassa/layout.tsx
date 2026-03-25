import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Horeca kassa & POS-systeem',
  description:
    'Professioneel kassasysteem voor horeca, café en frituur: snelle touchscreen-kassa, tafels en afhaal, gesplitste betaling (Bancontact, kaart, cash, iDEAL), bonprinter en koppeling met keukenscherm. Werkt op iPad en iPhone.',
  keywords: [
    'horeca kassa',
    'kassasysteem',
    'POS restaurant',
    'touchscreen kassa',
    'iPad kassa horeca',
    'frituur kassa',
    'horeca betaalsysteem',
    'bonprinter',
    'smartphone kassa',
  ],
  openGraph: {
    title: 'Vysion Horeca Kassa | POS voor horeca & frituur',
    description:
      'Complete horeca-kassa met tafelbeheer, betalingen en keukenkoppeling. 14 dagen gratis.',
    url: '/kassa',
    images: [{ url: '/images/kassa-platform-1.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vysion Horeca Kassa | POS voor horeca',
    images: ['/images/kassa-platform-1.png'],
  },
  alternates: {
    canonical: '/kassa',
  },
}

export default function KassaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
