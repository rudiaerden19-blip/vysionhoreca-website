import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Abonnementen',
  description:
    'Abonnementen Vysion Horeca: horeca kassa, online bestelplatform, kassahardware en software in één. Maandelijks opzegbaar, 14 dagen gratis kassa proberen.',
  keywords: [
    'vysion horeca abonnement',
    'horeca software abonnement',
    'kassa abonnement',
    'bestelplatform abonnement',
    'kassahardware lease',
    'gratis kassa proberen',
    'restaurant SaaS België',
  ],
  openGraph: {
    title: 'Abonnementen | Vysion Horeca',
    description:
      'Kassa, bestelplatform en hardware — transparante abonnementen, gratis proefperiode.',
    url: '/abonnementen',
    images: [{ url: '/images/kassa-platform-1.png' }],
  },
  alternates: {
    canonical: '/abonnementen',
  },
}

export default function AbonnementenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
