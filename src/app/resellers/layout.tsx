import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resellers & partners',
  description:
    'Partnerprogramma voor Vysion Horeca: kassa, online bestelplatform, hardware en horecasoftware voor resellers.',
  openGraph: {
    title: 'Resellers | Vysion Horeca',
    description: 'Partnerschap rond kassa, bestelplatform en hardware.',
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
