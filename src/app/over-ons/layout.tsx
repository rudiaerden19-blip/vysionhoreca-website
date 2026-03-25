import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Over Vysion Horeca',
  description:
    'Leer Vysion Horeca kennen: het alles-in-één platform voor horeca-ondernemers met kassa, reserveringsplatform, online bestellen en praktische tools om slimmer te werken.',
  openGraph: {
    title: 'Over ons | Vysion Horeca',
    description:
      'Software gebouwd voor horeca: van kassa en reserveringen tot analyse.',
    url: '/over-ons',
    images: [{ url: '/images/reservation-platform-1.png' }],
  },
  alternates: {
    canonical: '/over-ons',
  },
}

export default function OverOnsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
