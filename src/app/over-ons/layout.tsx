import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Over Vysion Horeca',
  description:
    'Vysion Horeca: alles-in-één voor ondernemers — touchscreen kassa (POS), online bestelplatform, kassahardware, reserveringen, keukenscherm en analyses. België & Nederland.',
  openGraph: {
    title: 'Over ons | Vysion Horeca',
    description:
      'Van horeca kassa en bestelplatform tot hardware en analyse — één team.',
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
