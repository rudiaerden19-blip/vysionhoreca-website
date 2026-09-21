import type { Metadata } from 'next'

import {
  KLEDINGWINKEL_DESCRIPTION,
  KLEDINGWINKEL_OG_IMAGE,
  KLEDINGWINKEL_PATH,
  KLEDINGWINKEL_TITLE,
  kledingwinkelCanonicalUrl,
} from '@/lib/kledingwinkel-landing'
import { VYSION_BRAND_SITE_NAME } from '@/lib/vysion-site'

export const metadata: Metadata = {
  title: { absolute: KLEDINGWINKEL_TITLE },
  description: KLEDINGWINKEL_DESCRIPTION,
  alternates: { canonical: KLEDINGWINKEL_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: KLEDINGWINKEL_TITLE,
    description: KLEDINGWINKEL_DESCRIPTION,
    type: 'website',
    locale: 'nl_BE',
    url: kledingwinkelCanonicalUrl(),
    siteName: VYSION_BRAND_SITE_NAME,
    images: [{ url: KLEDINGWINKEL_OG_IMAGE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: KLEDINGWINKEL_TITLE,
    description: KLEDINGWINKEL_DESCRIPTION,
    images: [KLEDINGWINKEL_OG_IMAGE],
  },
}

export default function KledingwinkelSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
