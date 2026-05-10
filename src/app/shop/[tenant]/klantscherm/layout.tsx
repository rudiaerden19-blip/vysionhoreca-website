import type { ReactNode } from 'react'
import type { Viewport } from 'next'

/** Klantscherm vult het popup-/monitorvlak; zwarte systeem-/browseraccenten. */
export async function generateViewport(): Promise<Viewport> {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: '#000000',
  }
}

export default function KlantschermLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[2147483646] box-border min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-y-none bg-black text-white [-webkit-overflow-scrolling:touch]"
      style={{ width: '100vw', minHeight: '100dvh', height: '100dvh' }}
    >
      {children}
    </div>
  )
}
