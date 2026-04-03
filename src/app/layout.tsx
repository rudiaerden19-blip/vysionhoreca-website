import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/i18n'
import '@/lib/silence-console-prod' // Silence console.log in production
import { GlobalAutoCapitalize } from '@/components/GlobalAutoCapitalize'
import { PageViewTracker } from '@/components/PageViewTracker'
import { PWARegister } from '@/components/PWARegister'
import { InstallAppHint } from '@/components/InstallAppHint'

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
        'Alles-in-één horecasoftware: kassa (POS), reserveringsplatform, online bestelplatform, keukenscherm, kostencalculator, urenregistratie en bedrijfsanalyse voor België en Nederland.',
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
      sameAs: ['https://www.vysionapps.io'],
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
      'Vysion Horeca | Horeca kassa, reserveringsplatform & online bestelplatform',
    template: '%s | Vysion Horeca',
  },
  description:
    'Alles-in-één voor horeca en frituur: touchscreen kassa (POS), reserveringsplatform met plattegrond, online bestelplatform, keukenscherm, WhatsApp-bestellen, kostencalculator, urenregistratie, loonadministratie en bedrijfsanalyse. Bancontact, iDEAL, 14 dagen gratis proefperiode. België & Nederland.',
  keywords: [
    'horeca kassa',
    'kassasysteem horeca',
    'POS horeca',
    'touchscreen kassa',
    'reserveringsplatform',
    'online reserveren restaurant',
    'tafels reserveren',
    'online bestelplatform',
    'online bestellen horeca',
    'bestelsysteem restaurant',
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
  manifest: '/manifest.json',
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
      'Vysion Horeca | Kassa, reserveringsplatform, online bestellen & meer',
    description:
      'Complete horecasoftware: kassa, reserveringen, online bestellen, keukenscherm, kosten, uren en analyse. Probeer gratis.',
    type: 'website',
    locale: 'nl_BE',
    url: siteUrl,
    siteName: 'Vysion Horeca',
    images: [{ url: '/images/online-order-platform-1.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Vysion Horeca | Kassa, reserveringsplatform & online bestelplatform',
    description:
      'Horeca kassa, reserveringen, online bestellen, keukenscherm en analyses — één platform.',
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
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <LanguageProvider>
          <PWARegister />
          <InstallAppHint />
          <GlobalAutoCapitalize />
          <PageViewTracker />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}

