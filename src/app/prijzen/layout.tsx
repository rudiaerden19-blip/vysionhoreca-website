import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prijzen & abonnementen',
  description:
    'Transparante prijzen voor Vysion Horeca: alles-in-één pakket met kassa, reserveringsplatform, online bestellen, keukenscherm en meer. Starter en Pro, maandelijks of jaarabonnement.',
  keywords: [
    'vysion horeca prijzen',
    'horeca software abonnement',
    'kassa software kosten',
    'restaurant software prijs',
    'België horeca POS',
  ],
  openGraph: {
    title: 'Prijzen | Vysion Horeca',
    description:
      'Bekijk abonnementen voor kassa, reserveringen en online bestellen — zonder verrassingen.',
    url: '/prijzen',
    images: [{ url: '/images/kassa-platform-1.png' }],
  },
  alternates: {
    canonical: '/prijzen',
  },
}

export default function PrijzenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
