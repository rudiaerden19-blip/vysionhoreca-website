import type { Viewport } from 'next'

/**
 * Vaste theme-color op de kassa: anders kleurt de browser-/statusbalk mee met tenant primary (vaak oranje).
 */
export const viewport: Viewport = {
  themeColor: '#3C4D6B',
}

export default function KassaLayout({ children }: { children: React.ReactNode }) {
  return children
}
