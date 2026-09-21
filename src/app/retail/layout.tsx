import type { Metadata } from 'next'

import { VYSION_BRAND_SITE_NAME, VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'

const TITLE = `Kassa voor retail & groothandel | ${VYSION_BRAND_SITE_NAME}`
const DESCRIPTION =
  'Vysion kassa voor boetieks, elektronica, geschenkzaken, dierenwinkels en groothandel. Touchscreen POS, voorraad en hardware. 14 dagen gratis proberen.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/retail' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'nl_BE',
    url: `${VYSION_CANONICAL_ORIGIN}/retail`,
    siteName: VYSION_BRAND_SITE_NAME,
    images: [{ url: '/images/hardware/hardware-vm20-sunmi.png' }],
  },
}

export default function RetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
