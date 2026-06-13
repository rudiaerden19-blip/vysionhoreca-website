import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prijzen & abonnementen',
  description:
    "Prijzen Vysion kassa: kassa (POS), online bestelplatform en kassahardware in transparante abonnementen. Starter en Pro, maandelijks of jaarlijks — 14 dagen gratis proberen.",
  keywords: [
    'vysion kassa prijzen',
    'kassa abonnement',
    'kassa software abonnement',
    'kassa software kosten',
    'kassahardware prijs',
    'online bestelplatform kosten',
    'restaurant software prijs',
    'België kassa POS',
  ],
  openGraph: {
    title: "Prijzen | Vysion kassa",
    description:
      'Abonnementen voor kassa, bestelplatform en hardware — duidelijke prijzen, gratis proefperiode.',
    url: '/prijzen',
    images: [{ url: '/images/kassa-platform-1.png'}],
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
