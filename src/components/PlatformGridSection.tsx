'use client'

import Image from 'next/image'
import { useLanguage } from '@/i18n'
import MarketingStartAndDemoButtons from '@/components/MarketingStartAndDemoButtons'
import { PLATFORM_PAGES } from '@/lib/platform-pages'

const cardShellClasses =
  'group flex min-h-[240px] sm:min-h-[260px] flex-col rounded-2xl border border-gray-200/60 bg-[#f4f4f4] text-center shadow-home-card transition-all duration-300 hover:z-10 hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.55),0_28px_70px_-12px_rgba(232,90,60,0.42),0_0_0_1px_rgba(232,90,60,0.2),0_0_60px_8px_rgba(232,90,60,0.28)] active:z-10 active:-translate-y-0.5 active:border-accent/60 active:shadow-[0_12px_40px_-6px_rgba(232,90,60,0.6),0_28px_70px_-12px_rgba(232,90,60,0.48),0_0_0_1px_rgba(232,90,60,0.22),0_0_72px_10px_rgba(232,90,60,0.32)]'

export default function PlatformGridSection() {
  const { t } = useLanguage()

  return (
    <section id="platform" className="py-20 sm:py-28 lg:py-36 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-12 sm:mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            {t('platform.sectionTitle')}
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-gray-800 font-medium leading-snug">
            {t('platform.sectionSubtitle1')}
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5 sm:gap-6 lg:gap-7 items-start">
          {PLATFORM_PAGES.map(({ slug, msgKey, cardHeaderImage }) => {
            const headerAlt =
              cardHeaderImage && t(`platform.${msgKey}.cardHeaderAlt`) !==
                `platform.${msgKey}.cardHeaderAlt`
                ? t(`platform.${msgKey}.cardHeaderAlt`)
                : ''

            return (
              <div key={slug} className={cardShellClasses}>
                <div className="relative h-28 sm:h-32 w-full shrink-0 overflow-hidden rounded-t-2xl bg-gradient-to-br from-gray-300 via-gray-200 to-gray-100">
                  {cardHeaderImage ? (
                    <Image
                      src={cardHeaderImage}
                      alt={headerAlt}
                      fill
                      loading="lazy"
                      className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
                    />
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col items-center px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2.5 leading-snug px-1">
                    {t(`platform.${msgKey}.title`)}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed break-words [overflow-wrap:anywhere]">
                    {t(`platform.${msgKey}.teaser`)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-10 sm:mt-12 max-w-5xl mx-auto text-center">
          <p className="text-sm sm:text-base text-gray-600 leading-snug">
            {t('platform.gridTrustLine')}
          </p>
          <MarketingStartAndDemoButtons className="mt-[2cm]" />
        </div>
      </div>
    </section>
  )
}
