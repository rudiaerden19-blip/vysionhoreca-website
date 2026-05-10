import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import { Orbitron } from 'next/font/google'

const klantschermDigital = Orbitron({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-klantscherm-digital',
  display: 'swap',
})

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
      className={`${klantschermDigital.variable} fixed inset-0 z-[2147483646] box-border m-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-x-hidden overflow-y-auto overscroll-none bg-black p-0 text-white antialiased [-webkit-tap-highlight-color:transparent]`}
    >
      {children}
    </div>
  )
}
