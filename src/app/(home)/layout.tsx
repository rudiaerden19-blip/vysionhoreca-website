import type { Metadata } from 'next'

import { VYSION_CANONICAL_ORIGIN, VYSION_BRAND_SITE_NAME } from '@/lib/vysion-site'
import {
  MARKETING_HOME_DESCRIPTION,
  MARKETING_HOME_TITLE,
} from '@/lib/marketing-home-seo'

const siteUrl = VYSION_CANONICAL_ORIGIN

export const metadata: Metadata = {
  title: {
    absolute: MARKETING_HOME_TITLE,
  },
  description: MARKETING_HOME_DESCRIPTION,
  robots: { index: true, follow: true },
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
    title: MARKETING_HOME_TITLE,
    description: MARKETING_HOME_DESCRIPTION,
    type: 'website',
    locale: 'nl_BE',
    url: siteUrl,
    siteName: VYSION_BRAND_SITE_NAME,
    images: [{ url: '/images/online-order-platform-1.png'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: MARKETING_HOME_TITLE,
    description: MARKETING_HOME_DESCRIPTION,
    images: ['/images/online-order-platform-1.png'],
  },
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children
}
