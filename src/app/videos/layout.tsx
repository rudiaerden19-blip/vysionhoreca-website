import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Video’s & demo',
  description:
    'Video’s over Vysion Horeca: kassa, reserveringsplatform, online bestellen en meer.',
  openGraph: {
    title: "Video’s | Vysion Horeca",
    url: '/videos',
  },
  alternates: {
    canonical: '/videos',
  },
}

export default function VideosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
