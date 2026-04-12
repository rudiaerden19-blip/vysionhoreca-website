import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gratis account aanmaken',
  description:
    'Gratis kassa en software 14 dagen uitproberen: touchscreen POS, online bestelplatform, kassahardware-opties, reserveringen, keukenscherm en analyse. Registreer in enkele minuten.',
  keywords: [
    'vysion horeca registratie',
    'gratis kassa',
    'gratis kassa software',
    'horeca software gratis proberen',
    'online bestelplatform gratis',
    'kassa trial',
    'restaurant software trial',
  ],
  openGraph: {
    title: 'Gratis starten | Vysion Horeca',
    description:
      'Gratis kassa, bestelplatform en modules 14 dagen — start vandaag.',
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
