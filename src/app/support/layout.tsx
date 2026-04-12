import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support & contact',
  description:
    'Support voor Vysion Horeca: horeca kassa, online bestelplatform, kassahardware, reserveringen en andere modules. Contact en veelgestelde vragen.',
  openGraph: {
    title: 'Support | Vysion Horeca',
    description: 'Hulp bij kassa, bestelplatform, hardware en account.',
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
