import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/i18n'
import '@/lib/silence-console-prod' // Silence console.log in production
import { GlobalAutoCapitalize } from '@/components/GlobalAutoCapitalize'
import { PageViewTracker } from '@/components/PageViewTracker'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Vysion Horeca | Alles-in-1: Bestelplatform, Gratis Website, Kostencalculator, Personeel & Bedrijfsanalyse',
  description: 'Vysion Horeca: Het complete alles-in-1 platform voor horeca. Bestelplatform, gratis website, kostencalculator, personeelsbeheer en bedrijfsanalyse. Probeer 14 dagen gratis.',
  keywords: 'kassa, horeca, restaurant, frituur, POS, betaalterminal, online bestellen, kostencalculator, personeel, bedrijfsanalyse, België',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Vysion Horeca | Alles-in-1: Bestelplatform, Gratis Website, Kostencalculator, Personeel & Bedrijfsanalyse',
    description: 'Het complete alles-in-1 platform voor horeca. Bestelplatform, gratis website, kostencalculator, personeel & bedrijfsanalyse.',
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
    <html lang="nl" className={inter.variable}>
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        <LanguageProvider>
          <GlobalAutoCapitalize />
          <PageViewTracker />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}

