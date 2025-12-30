import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vysion Horeca | Alles-in-één Kassa & Betaalplatform',
  description: 'Het complete kassasysteem voor horeca. Kassa, online bestellingen, facturatie, personeelsbeheer en meer - allemaal in één platform. Probeer 30 dagen gratis.',
  keywords: 'kassa, horeca, restaurant, frituur, POS, betaalterminal, online bestellen, België',
  openGraph: {
    title: 'Vysion Horeca | Alles-in-één Kassa & Betaalplatform',
    description: 'Het complete kassasysteem voor horeca. Probeer 30 dagen gratis.',
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
    <html lang="nl">
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}

