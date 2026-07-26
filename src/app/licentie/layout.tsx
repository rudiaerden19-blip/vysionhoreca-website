import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aankoop licentie',
  description:
    'Eenmalige levenslange Vysion licentie voor hardware en software — €1.499 excl. BTW. Alternatief voor maandelijk abonnement.',
  openGraph: {
    title: 'Aankoop licentie | Vysion kassa',
    description:
      'Levenslange licentie hardware en software voor €1.499 excl. BTW.',
    url: '/licentie',
    images: [{ url: '/images/online-order-platform-1.png' }],
  },
  alternates: {
    canonical: '/licentie',
  },
}

export default function LicentieLayout({ children }: { children: React.ReactNode }) {
  return children
}
