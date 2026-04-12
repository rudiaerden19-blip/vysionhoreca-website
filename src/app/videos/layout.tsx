import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Video’s & demo',
  description:
    'Video’s en demo’s: horeca kassa (POS), online bestelplatform, kassahardware, reserveringen en online bestellen.',
  openGraph: {
    title: "Video’s | Vysion Horeca",
    description: 'Uitleg over kassa, bestelplatform, hardware en platformfuncties.',
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
