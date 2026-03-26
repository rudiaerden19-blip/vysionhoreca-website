'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Navigation,
  Footer,
  BestelplatformFeaturesSection,
  KassasysteemFeaturesSection,
  KassasysteemHorecaSection,
} from '@/components'
import { useLanguage } from '@/i18n'
import {
  BESTELPLATFORM_PAGE_HERO_IMAGE,
  KASSASYSTEEM_HERO_IMAGE,
  getPlatformPage,
} from '@/lib/platform-pages'

const LIVE_DEMO_URL = 'https://frituurnolim.ordervysion.com'

export default function PlatformDetailPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const config = getPlatformPage(slug)
  const { t, locale } = useLanguage()

  if (!config) {
    return (
      <main>
        <Navigation />
        <section className="bg-[#e3e3e3] min-h-[50vh] pt-28 pb-20 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('platform.notFoundTitle')}</h1>
          <Link href="/" className="text-accent font-semibold underline">
            {t('platform.notFoundCta')}
          </Link>
        </section>
        <Footer />
      </main>
    )
  }

  const prefix = `platform.${config.msgKey}`
  const bodyRaw = t(`${prefix}.body`)
  const paragraphs =
    bodyRaw === `${prefix}.body` ? [] : bodyRaw.split('\n\n').filter(Boolean)

  return (
    <main>
      <Navigation />
      <article className="bg-white">
        {slug === 'bestelplatform' && (
          <div className="relative w-full min-h-[min(42svh,520px)] sm:min-h-[min(48svh,580px)] border-b border-gray-900/80 bg-gray-900">
            <Image
              src={BESTELPLATFORM_PAGE_HERO_IMAGE}
              alt={t('platform.bestelplatform.heroAlt')}
              fill
              className="object-cover object-center"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-black/55" aria-hidden />
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight max-w-4xl drop-shadow-md">
                {t('platform.bestelplatform.title')}
              </h1>
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                <a
                  href={`/registreer?lang=${locale}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-accent hover:bg-accent/90 text-white font-semibold px-8 py-4 min-w-[200px] text-center shadow-lg transition-colors"
                >
                  {t('heroLanding.ctaStartFree')}
                </a>
                <a
                  href={LIVE_DEMO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border-2 border-white/90 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-4 min-w-[200px] text-center shadow-lg transition-colors"
                >
                  {t('heroLanding.ctaViewDemo')}
                </a>
              </div>
            </div>
          </div>
        )}

        {slug === 'kassasysteem' && (
          <div className="relative w-full min-h-[min(42svh,520px)] sm:min-h-[min(48svh,580px)] border-b border-gray-900/80 bg-gray-900">
            <Image
              src={KASSASYSTEEM_HERO_IMAGE}
              alt={t('platform.kassasysteem.heroAlt')}
              fill
              className="object-cover object-center"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-black/55" aria-hidden />
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight max-w-4xl drop-shadow-md">
                {t('platform.kassasysteem.title')}
              </h1>
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                <a
                  href={`/registreer?lang=${locale}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-accent hover:bg-accent/90 text-white font-semibold px-8 py-4 min-w-[200px] text-center shadow-lg transition-colors"
                >
                  {t('heroLanding.ctaStartFree')}
                </a>
                <a
                  href={LIVE_DEMO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border-2 border-white/90 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-4 min-w-[200px] text-center shadow-lg transition-colors"
                >
                  {t('heroLanding.ctaViewDemo')}
                </a>
              </div>
            </div>
          </div>
        )}

        <div
          className={`mx-auto px-4 sm:px-6 lg:px-8 pb-16 ${
            slug === 'bestelplatform' || slug === 'kassasysteem' ? 'max-w-4xl pt-10' : 'max-w-3xl pt-28'
          }`}
        >
          {slug !== 'kassasysteem' && (
            <Link
              href="/#platform"
              className="inline-block text-accent font-semibold text-sm mb-8 hover:underline"
            >
              ← {t('platform.detailBack')}
            </Link>
          )}
          {slug !== 'kassasysteem' && slug !== 'bestelplatform' && (
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">{t(`${prefix}.title`)}</h1>
          )}
          <p className="text-lg text-gray-600 leading-relaxed mb-10">{t(`${prefix}.teaser`)}</p>
          <div className="prose prose-lg text-gray-700 space-y-4 max-w-none">
            {paragraphs.map((p, i) => (
              <p key={i} className="leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {slug !== 'kassasysteem' && slug !== 'bestelplatform' && (
            <div className="mt-12 flex flex-wrap gap-4">
              <a
                href={`/registreer?lang=${locale}`}
                className="inline-flex items-center justify-center rounded-full bg-accent hover:bg-accent/90 text-white font-semibold px-8 py-4 transition-colors"
              >
                {t('platform.detailCta')}
              </a>
              <Link
                href={`/#contact`}
                className="inline-flex items-center justify-center rounded-full border-2 border-gray-300 text-gray-900 font-semibold px-8 py-4 hover:border-accent hover:text-accent transition-colors"
              >
                {t('heroLanding.demoRequest')}
              </Link>
            </div>
          )}
        </div>

        {slug === 'bestelplatform' && <BestelplatformFeaturesSection />}
        {slug === 'kassasysteem' && (
          <>
            <KassasysteemHorecaSection />
            <KassasysteemFeaturesSection />
          </>
        )}
      </article>
      <Footer />
    </main>
  )
}
