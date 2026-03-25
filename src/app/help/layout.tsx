import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Helpcentrum',
  description:
    'Help en uitleg over Vysion Horeca: kassa, bestellingen, reserveringen en instellingen.',
  openGraph: {
    title: 'Help | Vysion Horeca',
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
