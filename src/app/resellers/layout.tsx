import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resellers & partners',
  description:
    'Partnerprogramma en resellers voor Vysion Horeca horecasoftware.',
  openGraph: {
    title: 'Resellers | Vysion Horeca',
    url: '/resellers',
  },
  alternates: {
    canonical: '/resellers',
  },
}

export default function ResellersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
