import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Orbitron } from 'next/font/google'

const klantschermDigital = Orbitron({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-klantscherm-digital',
  display: 'swap',
})

/** Minder browser-chrome-hints (echte adresbalk verdwijnt vooral bij volledig scherm). */
export const metadata: Metadata = {
  title: 'Klantscherm',
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Klantscherm',
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
    date: false,
  },
}

/** Klantscherm vult het popup-/monitorvlak; zwarte systeem-/browseraccenten. */
export async function generateViewport(): Promise<Viewport> {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#000000' },
      { media: '(prefers-color-scheme: dark)', color: '#000000' },
    ],
    viewportFit: 'cover',
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
