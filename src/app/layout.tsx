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
  description: 'Het complete kassasysteem voor horeca. Kassa, online bestellingen, facturatie, personeelsbeheer en meer - allemaal in één platform. Probeer 14 dagen gratis.',
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
    description: 'Het complete kassasysteem voor horeca. Probeer 14 dagen gratis.',
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
    <html lang="nl" className={inter.variable} style={{ overflowX: 'hidden' }}>
      <body className={`${inter.className} bg-white text-gray-900 antialiased`} style={{ overflowX: 'hidden' }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '100vw', 
          overflowX: 'hidden',
          overflowY: 'visible'
        }}>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </div>
      </body>
    </html>
  )
}

