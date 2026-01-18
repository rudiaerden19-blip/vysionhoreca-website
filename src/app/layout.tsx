import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/i18n'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Vysion Horeca | Alles-in-één Kassa & Betaalplatform',
  description: 'Het complete kassasysteem voor horeca. Kassa, online bestellingen, facturatie, personeelsbeheer en meer - allemaal in één platform. Probeer 7 dagen gratis.',
  keywords: 'kassa, horeca, restaurant, frituur, POS, betaalterminal, online bestellen, België',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  openGraph: {
    title: 'Vysion Horeca | Alles-in-één Kassa & Betaalplatform',
    description: 'Het complete kassasysteem voor horeca. Probeer 7 dagen gratis.',
    type: 'website',
    locale: 'nl_BE',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={`${inter.variable} overflow-x-hidden`}>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('scrollRestoration' in history) {
              history.scrollRestoration = 'manual';
            }
            window.scrollTo(0, 0);
          `
        }} />
      </head>
      <body className={`${inter.className} bg-white text-gray-900 antialiased overflow-x-hidden max-w-[100vw]`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}

