import type { Metadata } from 'next'

const canonical = '/sectoren/hardware-en-platform'

export const metadata: Metadata = {
  title: {
    absolute: 'Gratis Online Platform & i5 Kassa Hardware | De Vysion Deal',
  },
  description:
    'High-end i5-kassa (Het Beest), 44 video-instructies, 9 talen, eigendom na 24 maanden — stop met zinloos huren. Snelste kassa-ervaring, kassa kopen of gratis proef, kassasysteem België & Nederland.',
  keywords: [
    'i5 kassa hardware',
    'gratis online platform',
    'kassa kopen',
    'snelste kassa',
    'kassasysteem België',
    'horeca software',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Gratis Online Platform & i5 Kassa Hardware | De Vysion Deal',
    description: 'i5 hardware, video’s, 9 talen, eigendom na 24 maanden. Kassasysteem België.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gratis Online Platform & i5 Kassa Hardware | De Vysion Deal',
    description: 'De Vysion-deal: i5, platform, eigendom. Kassa kopen of proef gratis.',
  },
}

export default function HardwarePlatformSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
