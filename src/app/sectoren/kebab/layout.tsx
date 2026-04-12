import type { Metadata } from 'next'

const canonical = '/sectoren/kebab'

export const metadata: Metadata = {
  title: {
    absolute: 'Kebab & Broodjesbar Kassa | i5 Kracht | Vysion',
  },
  description:
    'Kebab, döner en broodjesbar: i5 dual-screen kassa, 9 talen, snelle orders. Stop met huren. Na 24 maanden is deze i5 kassa 100% jouw eigendom. Horeca kassa België & Nederland.',
  keywords: [
    'kebab kassa',
    'broodjesbar kassa',
    'horeca kassa',
    'snelste kassa',
    'kassasysteem België',
    'i5 kassa',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Kebab & Broodjesbar Kassa | i5 Kracht | Vysion',
    description: 'Kebab & broodjesbar: i5, 9 talen, snelle checkout. Start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kebab & Broodjesbar Kassa | i5 Kracht | Vysion',
    description: 'Kebab POS met i5-kracht. België & Nederland — probeer gratis.',
  },
}

export default function KebabSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
