import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Helpcentrum',
  description:
    'Help bij Vysion Horeca: horeca kassa (POS), online bestelplatform, hardware, bestellingen, reserveringen en instellingen.',
  openGraph: {
    title: 'Help | Vysion Horeca',
    description: 'Handleidingen voor kassa, bestelplatform en overige modules.',
    url: '/help',
  },
  alternates: {
    canonical: '/help',
  },
}

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
