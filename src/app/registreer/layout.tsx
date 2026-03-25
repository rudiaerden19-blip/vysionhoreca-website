import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gratis account aanmaken',
  description:
    'Start 14 dagen gratis met Vysion Horeca: kassa, reserveringsplatform, online bestelplatform, keukenscherm en analysetools voor je zaak. Registreer in enkele minuten.',
  keywords: [
    'vysion horeca registratie',
    'horeca software gratis proberen',
    'gratis kassa software',
    'restaurant software trial',
  ],
  openGraph: {
    title: 'Gratis starten | Vysion Horeca',
    description:
      'Probeer kassa, reserveringen en online bestellen 14 dagen gratis.',
    url: '/registreer',
    images: [{ url: '/images/online-order-platform-1.png' }],
  },
  alternates: {
    canonical: '/registreer',
  },
}

export default function RegistreerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
