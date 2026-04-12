import type { Metadata } from 'next'

const siteUrl = 'https://www.vysionhoreca.com'

/** SEO homepage (/): kernzoektermen kassa, bestelplatform, hardware, gratis proberen. */
const HOME_TITLE =
  'Horeca kassa, online bestelplatform & hardware | Gratis proberen | Vysion'
const HOME_DESCRIPTION =
  'Vysion: touchscreen horeca kassa (POS), online bestelplatform en webshop, premium kassahardware (Intel i5). 14 dagen gratis kassa software — reserveringen, keukenscherm, WhatsApp, 9 talen. België & Nederland.'

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  keywords: [
    'horeca kassa',
    'gratis kassa',
    'online bestelplatform',
    'bestelplatform horeca',
    'kassahardware',
    'touchscreen kassa',
    'POS software horeca',
    'kassa software gratis proberen',
    'WhatsApp bestellen restaurant',
    'keukenscherm',
    'horeca software België',
  ],
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
