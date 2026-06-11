import type { Metadata } from 'next'

import { VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'

const siteUrl = VYSION_CANONICAL_ORIGIN

/** SEO homepage (/): kernzoektermen kassa, bestelplatform, hardware, gratis proberen. */
const HOME_TITLE =
  'Kassa, online bestelplatform & hardware | Gratis proberen | Vysion kassa\'s'
const HOME_DESCRIPTION =
  'Zoek je een kassa, online bestelplatform of gratis uitproberen? Vysion: touchscreen POS, webshop, premium kassahardware (Intel i7). 14 dagen gratis — reserveringen, keukenscherm, WhatsApp, 9 talen. België & Nederland.'

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  keywords: [
    'kassa software',
    'gratis kassa',
    'online bestelplatform',
    'bestelplatform',
    'kassahardware',
    'touchscreen kassa',
    'POS software',
    'kassa software gratis proberen',
    'WhatsApp bestellen restaurant',
    'keukenscherm',
    'kassa software België',
    'kassa gratis proberen',
    'gratis kassa',
    'kassa en bestelplatform',
    'bestelplatform gratis proberen',
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
    siteName: "Vysion kassa's",
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
