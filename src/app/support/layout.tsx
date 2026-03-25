import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support & contact',
  description:
    'Hulp bij Vysion Horeca: ondersteuning voor kassa, reserveringsplatform, online bestellen en andere modules. Contact en veelgestelde vragen.',
  openGraph: {
    title: 'Support | Vysion Horeca',
    url: '/support',
  },
  alternates: {
    canonical: '/support',
  },
}

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
