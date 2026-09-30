import type { Viewport } from 'next'

/** Touch-kassa: geen pinch-zoom tijdens volume/controls. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function VysionMusicLayout({ children }: { children: React.ReactNode }) {
  return children
}
