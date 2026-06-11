import type { Metadata } from 'next'

const canonical = '/sectoren/kebab'

export const metadata: Metadata = {
  title: {
    absolute: 'Kebab & Broodjesbar Kassa | i7 Kracht | Vysion kassa',
  },
  description:
    'Kebab, döner en broodjesbar: i7 dual-screen kassa, 9 talen, snelle orders. Stop met huren. Na 24 maanden is deze i7 kassa 100% jouw eigendom. kassa België & Nederland.',
  keywords: [
    'kebab kassa',
    'broodjesbar kassa',
    'kassa',
    'snelste kassa',
    'kassasysteem België',
    'i7 kassa',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Kebab & Broodjesbar Kassa | i7 Kracht | Vysion kassa',
    description: 'Kebab & broodjesbar: i7, 9 talen, snelle checkout. Start gratis.',
    url: canonical,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kebab & Broodjesbar Kassa | i7 Kracht | Vysion kassa',
    description: 'Kebab POS met i7-kracht. België & Nederland — probeer gratis.',
  },
}

export default function KebabSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
