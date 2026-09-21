import type { Metadata } from 'next'

import { VYSION_BRAND_SITE_NAME, VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'

const TITLE = `Kassasysteem voor winkels & retail | ${VYSION_BRAND_SITE_NAME}`
const DESCRIPTION =
  'Compleet kassasysteem voor winkels en retail: verkoop, barcode, voorraad, klantenkaart, retour en webshop in één licentie. Hardware inbegrepen. 14 dagen gratis proberen.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/winkel' },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'nl_BE',
    url: `${VYSION_CANONICAL_ORIGIN}/winkel`,
    siteName: VYSION_BRAND_SITE_NAME,
    images: [{ url: '/images/hardware/hardware-tf30-kassa.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/images/hardware/hardware-tf30-kassa.png'],
  },
}

export default function WinkelLayout({ children }: { children: React.ReactNode }) {
  return children
}
