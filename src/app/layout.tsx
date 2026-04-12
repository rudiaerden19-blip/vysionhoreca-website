import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/i18n'
import '@/lib/silence-console-prod' // Silence console.log in production
import { GlobalAutoCapitalize } from '@/components/GlobalAutoCapitalize'
import { PageViewTracker } from '@/components/PageViewTracker'
import { PWARegister } from '@/components/PWARegister'
import SectorChoiceGate from '@/components/SectorChoiceGate'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /** Pinch-zoom toegestaan (iPhone/iPad, toegankelijkheid); layout blijft responsive via CSS. */
  maximumScale: 5,
  /** Lichte systeembalk (Android Chrome); oranje theme viel te hard op bij witte shop-header. */
  themeColor: '#ffffff',
}

const siteUrl = 'https://www.vysionhoreca.com'

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Vysion Horeca',
      legalName: 'Vysion Group International',
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
      description:
        'Horeca kassa (POS), online bestelplatform en kassahardware: alles-in-één met reserveringsplatform, keukenscherm, WhatsApp-bestellen, kosten en analyse. Gratis uitproberen — België en Nederland.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Siberiëstraat 24',
        addressLocality: 'Pelt',
        postalCode: '3900',
        addressCountry: 'BE',
      },
      vatID: 'BE1003226953',
      areaServed: [{ '@type': 'Country', name: 'België' }, { '@type': 'Country', name: 'Nederland' }],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'info@vysionhoreca.com',
        areaServed: ['BE', 'NL'],
        availableLanguage: ['Dutch', 'English', 'French', 'German'],
      },
      sameAs: [
        'https://www.vysionapps.io',
        'https://www.vysionhoreca.com',
        'https://www.webvysion.tech',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Vysion Horeca',
      publisher: { '@id': `${siteUrl}/#organization` },
      inLanguage: 'nl-BE',
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      'Vysion Horeca | Horeca kassa, online bestelplatform, hardware POS & gratis proberen',
    template: '%s | Vysion Horeca',
  },
  description:
    'Touchscreen horeca kassa (POS), online bestelplatform en webshop, premium kassahardware en software in één pakket. Gratis kassa 14 dagen uitproberen. Reserveringsplatform, keukenscherm, WhatsApp-bestellen, kosten en analyse. Bancontact, iDEAL. België & Nederland.',
  keywords: [
    'horeca kassa',
    'gratis kassa',
    'gratis kassa software',
    'kassasysteem horeca',
    'kassahardware',
    'touchscreen kassa',
    'POS horeca',
    'online bestelplatform',
    'horeca bestelplatform',
    'online bestellen horeca',
    'bestelsysteem restaurant',
    'reserveringsplatform',
    'online reserveren restaurant',
    'tafels reserveren',
    'keukenscherm',
    'kitchen display',
    'WhatsApp bestellen',
    'kostencalculator horeca',
    'urenregistratie',
    'loonadministratie horeca',
    'bedrijfsanalyse horeca',
    'horeca software België',
    'frituur software',
    'restaurant software',
  ],
  /** Web App Manifest: zie <link rel="manifest"> in <head> (Next metadata zou crossOrigin=use-credentials zetten → soms geen Install op Android). */
  other: {
    'mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vysion Horeca',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title:
      'Vysion Horeca | Horeca kassa, bestelplatform, hardware & gratis proberen',
    description:
      'Kassa (POS), online bestelplatform en kassahardware — reserveringen, keukenscherm en analyse. Start 14 dagen gratis.',
    type: 'website',
    locale: 'nl_BE',
    url: siteUrl,
    siteName: 'Vysion Horeca',
    images: [{ url: '/images/online-order-platform-1.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Vysion Horeca | Horeca kassa, bestelplatform, hardware & gratis proberen',
    description:
      'Touchscreen kassa, online bestelplatform en hardware POS — 14 dagen gratis. België & Nederland.',
    images: ['/images/online-order-platform-1.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <LanguageProvider>
          <PWARegister />
          <GlobalAutoCapitalize />
          <PageViewTracker />
          <SectorChoiceGate />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}

