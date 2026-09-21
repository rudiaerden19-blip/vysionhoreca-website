import type { Metadata } from 'next'

import { VYSION_BRAND_SITE_NAME, VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'

const TITLE = `Kassa voor winkels | bakker, slager, kapper | ${VYSION_BRAND_SITE_NAME}`
const DESCRIPTION =
  'Vysion kassa voor bakkers, slagers, kappers, kledingzaken en speciaalzaken. Touchscreen POS, webshop, voorraad en hardware. 14 dagen gratis proberen.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/winkel' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'nl_BE',
    url: `${VYSION_CANONICAL_ORIGIN}/winkel`,
    siteName: VYSION_BRAND_SITE_NAME,
    images: [{ url: '/images/kassa-platform-2.png' }],
  },
}

export default function WinkelLayout({ children }: { children: React.ReactNode }) {
  return children
}
