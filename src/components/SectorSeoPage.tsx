'use client'

import Image from 'next/image'
import { Navigation, Footer, CookieBanner } from '@/components'
import HardwareBeestSection from '@/components/HardwareBeestSection'
import MarketingStartAndDemoButtons from '@/components/MarketingStartAndDemoButtons'
import type { SectorPageContentKey } from '@/lib/sector-seo-routes'
import { useLanguage } from '@/i18n'

type Props = {
  sectorKey: SectorPageContentKey
  imageSrc: string
}

export default function SectorSeoPage({ sectorKey, imageSrc }: Props) {
  const { t } = useLanguage()
  const p = `sectorPages.${sectorKey}`

  return (
    <div className="min-h-screen bg-[#e3e3e3]">
      <Navigation />
      <main>
        <section className="pt-28 sm:pt-32 pb-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-accent uppercase tracking-wide mb-3">
              {t('sectorPages.breadcrumb')}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-[2.1rem] font-bold text-gray-900 leading-tight text-balance">
              {t(`${p}.h1`)}
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-700 leading-relaxed text-balance">
              {t(`${p}.intro`)}
            </p>
            <p className="mx-auto mt-8 max-w-3xl text-lg font-semibold leading-relaxed text-gray-900 text-balance sm:text-xl">
              {t(`${p}.ownership24`)}
            </p>
          </div>
        </section>

        <HardwareBeestSection />

        <section className="pb-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-home-image border border-gray-200 bg-white">
            <Image
              src={imageSrc}
              alt={t(`${p}.imageAlt`)}
              fill
              className="object-contain object-center p-4 sm:p-6"
              sizes="(min-width: 768px) 672px, 100vw"
              priority
            />
          </div>
        </section>

        <section className="pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-6 text-base sm:text-lg text-gray-700 leading-relaxed">
            <p>{t(`${p}.body1`)}</p>
            <p>{t(`${p}.body2`)}</p>
            <div className="pt-4">
              <MarketingStartAndDemoButtons />
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  )
}
