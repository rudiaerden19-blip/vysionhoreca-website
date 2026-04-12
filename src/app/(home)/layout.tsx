import type { Metadata } from 'next'

const siteUrl = 'https://www.vysionhoreca.com'

/** SEO voor homepage (/): bakkerij-focus + Google snippet. */
const HOME_TITLE =
  'Snelste Kassasysteem voor Bakkers | i5 Kracht & 9 Talen | Vysion'
const HOME_DESCRIPTION =
  'Ontdek de Vysion kassa voor de bakkerij. Razendsnel door i5 processor, 9 talen ondersteuning en na 24 maanden volledig jouw eigendom. Bekijk de video uitleg!'

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: 'website',
    locale: 'nl_BE',
    url: siteUrl,
    siteName: 'Vysion Horeca',
    images: [{ url: '/images/online-order-platform-1.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['/images/online-order-platform-1.png'],
  },
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children
}
