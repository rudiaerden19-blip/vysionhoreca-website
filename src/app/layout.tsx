import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/i18n'
import '@/lib/silence-console-prod' // Silence console.log in production
import { GlobalAutoCapitalize } from '@/components/GlobalAutoCapitalize'
import { PageViewTracker } from '@/components/PageViewTracker'
import { PWARegister } from '@/components/PWARegister'
import SectorChoiceGate from '@/components/SectorChoiceGate'
import { OsTouchKeyboardAssist } from '@/components/OsTouchKeyboardAssist'
import { WebAzertyKeyboard } from '@/components/WebAzertyKeyboard'
import { TENANT_APP_SHELL_THEME_COLOR } from '@/lib/theme-color'
import { VYSION_CANONICAL_ORIGIN, VYSION_BRAND_PRODUCT_NAME, VYSION_BRAND_SITE_NAME } from '@/lib/vysion-site'
import { VYSION_INFO_EMAIL } from '@/lib/vysion-contact'
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
  /** Donkerblauwe systeembalk (Android Safari/Chrome) — overal dezelfde als shop/tenant-shell. */
  themeColor: TENANT_APP_SHELL_THEME_COLOR,
}

const siteUrl = VYSION_CANONICAL_ORIGIN

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: VYSION_BRAND_SITE_NAME,
      alternateName: [VYSION_BRAND_PRODUCT_NAME],
      legalName: 'Vysion Group International',
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
      description:
        'Kassa (POS), online bestelplatform en kassahardware: alles-in-één met reserveringsplatform, keukenscherm, WhatsApp-bestellen, kosten en analyse. Gratis uitproberen — België en Nederland.',
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
        email: VYSION_INFO_EMAIL,
        areaServed: ['BE', 'NL'],
        availableLanguage: ['Dutch', 'English', 'French', 'German'],
      },
      sameAs: [
        'https://www.vysionapps.io',
        'https://www.vysion-kassa.com',
        'https://www.webvysion.tech',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: VYSION_BRAND_SITE_NAME,
      alternateName: [VYSION_BRAND_PRODUCT_NAME],
      description:
        'Zoek je een kassa, online bestelplatform of gratis uitproberen? Vysion kassa combineert POS, bestellen, hardware en reserveringen voor België en Nederland.',
      publisher: { '@id': `${siteUrl}/#organization` },
      inLanguage: 'nl-BE',
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: VYSION_BRAND_SITE_NAME,
  title: {
    default: `${VYSION_BRAND_SITE_NAME} | Kassa, online bestelplatform, hardware POS & gratis proberen`,
    template: `%s | ${VYSION_BRAND_SITE_NAME}`,
  },
  description:
    'Touchscreen kassa (POS), online bestelplatform en webshop, premium kassahardware en software in één pakket. Gratis kassa 14 dagen uitproberen. Reserveringsplatform, keukenscherm, WhatsApp-bestellen, kosten en analyse. Bancontact, iDEAL. België & Nederland.',
  keywords: [
    'kassa software',
    'gratis kassa',
    'gratis kassa software',
    'kassasysteem',
    'kassahardware',
    'touchscreen kassa',
    'POS kassa',
    'online bestelplatform',
    'online bestelplatform zaak',
    'online bestellen restaurant',
    'bestelsysteem restaurant',
    'reserveringsplatform',
    'online reserveren restaurant',
    'tafels reserveren',
    'keukenscherm',
    'kitchen display',
    'WhatsApp bestellen',
    'kostencalculator zaak',
    'urenregistratie',
    'loonadministratie',
    'bedrijfsanalyse',
    'kassa software België',
    'frituur software',
    'restaurant software',
    'kassa gratis proberen',
    'gratis kassa software',
    'POS gratis proberen',
    'kassa en bestelplatform',
    'online bestelplatform restaurant',
    'bestellen online',
    'touchscreen kassa gratis trial',
  ],
  /** Web App Manifest: zie <link rel="manifest"> in <head> (Next metadata zou crossOrigin=use-credentials zetten → soms geen Install op Android). */
  other: {
    'mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: VYSION_BRAND_SITE_NAME,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: `${VYSION_BRAND_SITE_NAME} | Kassa, bestelplatform, hardware & gratis proberen`,
    description:
      'Kassa (POS), online bestelplatform en kassahardware — reserveringen, keukenscherm en analyse. Start 14 dagen gratis.',
    type: 'website',
    locale: 'nl_BE',
    url: siteUrl,
    siteName: VYSION_BRAND_SITE_NAME,
    images: [{ url: '/images/online-order-platform-1.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${VYSION_BRAND_SITE_NAME} | Kassa, bestelplatform, hardware & gratis proberen`,
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
          <OsTouchKeyboardAssist />
          <WebAzertyKeyboard />
          <PageViewTracker />
          <SectorChoiceGate />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}

