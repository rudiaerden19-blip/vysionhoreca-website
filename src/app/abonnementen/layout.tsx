import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Abonnementen',
  description:
    'Vysion Horeca abonnementen: één platform met kassa, reserveringen, online bestellen en meer. Maandelijks opzegbaar, 14 dagen gratis proberen.',
  keywords: [
    'vysion horeca abonnement',
    'horeca software abonnement',
    'kassa abonnement',
    'restaurant SaaS België',
  ],
  openGraph: {
    title: 'Abonnementen | Vysion Horeca',
    description: 'Transparante abonnementen voor uw horeca — Pro of Premium, maandelijks of jaarlijks.',
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
