import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Neem contact op met Vysion Horeca: vragen over kassa, online bestellen, reserveringen of een demo. Mail info@vysionhoreca.com of bel ons team.',
  openGraph: {
    title: 'Contact | Vysion Horeca',
    description: 'Vragen of demo? Ons team helpt je graag verder.',
    url: '/contact',
  },
  alternates: {
    canonical: '/contact',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
