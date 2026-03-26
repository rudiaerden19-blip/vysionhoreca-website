'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Navigation, Footer, PlatformScreenshotGallery } from '@/components'
import { useLanguage } from '@/i18n'
import { BESTELPLATFORM_HERO_IMAGE, getPlatformPage } from '@/lib/platform-pages'

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
          <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white pt-24 sm:pt-28">
            <div className="mx-auto max-w-4xl px-4 pb-8 pt-4 sm:px-6">
              <div className="relative mx-auto aspect-[9/18] w-full max-w-[min(100%,280px)] overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-100 shadow-xl ring-1 ring-black/5 sm:max-w-[300px]">
                <Image
                  src={BESTELPLATFORM_HERO_IMAGE}
                  alt={t('platform.bestelplatform.cardHeaderAlt')}
                  fill
                  className="object-cover object-top"
                  sizes="300px"
                  priority
                />
              </div>
            </div>
          </div>
        )}

        <div
          className={`mx-auto px-4 sm:px-6 lg:px-8 pb-16 ${
            slug === 'bestelplatform' ? 'max-w-4xl pt-10' : 'max-w-3xl pt-28'
          }`}
        >
          <Link
            href="/#platform"
            className="inline-block text-accent font-semibold text-sm mb-8 hover:underline"
          >
            ← {t('platform.detailBack')}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">{t(`${prefix}.title`)}</h1>
          <p className="text-lg text-gray-600 leading-relaxed mb-10">{t(`${prefix}.teaser`)}</p>
          <div className="prose prose-lg text-gray-700 space-y-4 max-w-none">
            {paragraphs.map((p, i) => (
              <p key={i} className="leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {slug === 'bestelplatform' && (
            <PlatformScreenshotGallery
              images={[
                { src: '/images/platform/bestelplatform-1.png', alt: t('platform.bestelplatform.galleryAlt1') },
                { src: '/images/platform/bestelplatform-2.png', alt: t('platform.bestelplatform.galleryAlt2') },
              ]}
            />
          )}

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
        </div>
      </article>
      <Footer />
    </main>
  )
}
