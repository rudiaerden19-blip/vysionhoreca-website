'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Navigation, Footer, CookieBanner } from '@/components'
import ContactPageSection from '@/components/ContactPageSection'
import HomeScrollOnLoad from '@/components/HomeScrollOnLoad'
import MarketingStartAndDemoButtons from '@/components/MarketingStartAndDemoButtons'
import GoogleReviewsHeroBadge from '@/components/GoogleReviewsHeroBadge'
import { useLanguage } from '@/i18n'
import { LANDING_BRANCH_COLUMNS } from '@/lib/landing-branch-choice'
import {
  MONTHLY_PRICE_WITHOUT_HARDWARE,
  MONTHLY_PRICE_WITH_HARDWARE,
  monthlyPriceForHardware,
} from '@/lib/pricing-hardware'

const WINKEL_ITEM_KEYS =
  LANDING_BRANCH_COLUMNS.find((column) => column.id === 'winkel')?.itemKeys ?? []

const MODULE_KEYS = ['pos', 'stock', 'barcode', 'webshop', 'reports', 'support'] as const

const HARDWARE = [
  { src: '/images/hardware/hardware-tf30-kassa.png', alt: 'Elo touchscreen kassa' },
  { src: '/images/hardware/hardware-barcode-scanner.png', alt: 'Barcodescanner' },
  { src: '/images/hardware/hardware-premium-lade.png', alt: 'Kassalade' },
] as const

export default function WinkelSitePage() {
  const { t } = useLanguage()
  const [withHardware, setWithHardware] = useState(false)
  const price = monthlyPriceForHardware(withHardware)

  return (
    <main className="bg-[#f7f4ef] text-gray-900">
      <HomeScrollOnLoad />
      <Navigation />

      <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-sm font-extrabold tracking-[0.18em] text-[#0E5D82] mb-4">
              {t('sectorModal.columns.winkel.title')}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight text-[#0E5D82]">
              {t('winkelSite.title')}
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-gray-700 leading-relaxed max-w-xl">
              {t('winkelSite.lead')}
            </p>
            <ul className="mt-8 space-y-3 text-base sm:text-lg text-gray-800">
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5EC4E8]" aria-hidden />
                {t('winkelSite.point1')}
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5EC4E8]" aria-hidden />
                {t('winkelSite.point2')}
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5EC4E8]" aria-hidden />
                {t('winkelSite.point3')}
              </li>
            </ul>
            <div className="mt-8">
              <GoogleReviewsHeroBadge
                label={t('heroLanding.googleReviewsLabel')}
                ariaLabel={t('heroLanding.googleReviewsAria')}
                className="!bg-white !text-gray-900 !border-gray-200 hover:!bg-gray-50"
              />
            </div>
            <MarketingStartAndDemoButtons demoHref="/winkel#contact" className="mt-8 sm:justify-start" />
          </div>
          <div className="relative rounded-3xl bg-white border border-gray-200 shadow-home-float p-6 sm:p-10">
            <Image
              src="/images/hardware/hardware-tf30-kassa.png"
              alt={t('winkelSite.heroImageAlt')}
              width={720}
              height={560}
              priority
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white border-y border-gray-100" id="sectoren">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
            {t('winkelSite.usecasesTitle')}
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {WINKEL_ITEM_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-2xl border border-gray-200 bg-[#f7f4ef] px-4 py-5 text-center font-semibold text-gray-800"
              >
                {t(`sectorModal.columns.winkel.items.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 sm:py-24" id="platform">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            {t('winkelSite.modulesTitle')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULE_KEYS.map((key) => (
              <article key={key} className="rounded-2xl bg-white border border-gray-200 p-6 shadow-home-card">
                <h3 className="text-lg font-bold text-[#0E5D82] mb-2">
                  {t(`winkelSite.modules.${key}.title`)}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {t(`winkelSite.modules.${key}.body`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
            {t('winkelSite.hardwareTitle')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {HARDWARE.map((item) => (
              <div key={item.src} className="rounded-2xl border border-gray-200 bg-[#f7f4ef] p-6 flex items-center justify-center min-h-[12rem]">
                <Image src={item.src} alt={item.alt} width={280} height={220} className="w-full h-auto object-contain max-h-40" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="prijzen" className="py-16 sm:py-24">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            {t('winkelSite.pricingTitle')}
          </h2>
          <p className="text-gray-600 mb-8">{t('pricing.subtitle')}</p>
          <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-home-float">
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 mb-6">
              <button
                type="button"
                onClick={() => setWithHardware(false)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  !withHardware ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                €{MONTHLY_PRICE_WITHOUT_HARDWARE} {t('pricing.hardwareWithout')}
              </button>
              <button
                type="button"
                onClick={() => setWithHardware(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  withHardware ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                €{MONTHLY_PRICE_WITH_HARDWARE} {t('pricing.hardwareWith')}
              </button>
            </div>
            <p className="text-5xl font-extrabold tabular-nums text-[#0E5D82]">€ {price}</p>
            <p className="mt-1 text-gray-600 font-medium">{t('heroLanding.ctaModulesPricePeriod')}</p>
            <p className="mt-2 text-xs text-gray-500">{t('pricing.exclVat')}</p>
            <p className="mt-4 text-sm text-gray-600">{t('pricing.cancelAnytime')}</p>
            <a
              href="/licentie"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t('heroLanding.ctaModulesBackLink')}
            </a>
            <MarketingStartAndDemoButtons demoHref="/winkel#contact" className="mt-6" />
          </div>
        </div>
      </section>

      <ContactPageSection sectionId="contact" />
      <Footer />
      <CookieBanner />
    </main>
  )
}
