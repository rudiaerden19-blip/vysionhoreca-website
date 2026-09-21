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

const RETAIL_ITEM_KEYS =
  LANDING_BRANCH_COLUMNS.find((column) => column.id === 'retail')?.itemKeys ?? []

const MODULE_KEYS = ['pos', 'barcode', 'stock', 'wholesale', 'reports', 'support'] as const

const HARDWARE = [
  { src: '/images/hardware/hardware-vm20-sunmi.png', alt: 'Sunmi kassa' },
  { src: '/images/hardware/hardware-barcode-scanner.png', alt: 'Barcodescanner' },
  { src: '/images/hardware/hardware-printer-epson.png', alt: 'Epson printer' },
] as const

export default function RetailSitePage() {
  const { t } = useLanguage()
  const [withHardware, setWithHardware] = useState(false)
  const price = monthlyPriceForHardware(withHardware)

  return (
    <main className="bg-[#071825] text-white">
      <HomeScrollOnLoad />
      <Navigation />

      <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-sm font-extrabold tracking-[0.18em] text-[#5EC4E8] mb-4">
              {t('sectorModal.columns.retail.title')}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">
              {t('retailSite.title')}
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-white/80 leading-relaxed max-w-xl">
              {t('retailSite.lead')}
            </p>
            <ul className="mt-8 space-y-3 text-base sm:text-lg text-white/90">
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5EC4E8]" aria-hidden />
                {t('retailSite.point1')}
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5EC4E8]" aria-hidden />
                {t('retailSite.point2')}
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5EC4E8]" aria-hidden />
                {t('retailSite.point3')}
              </li>
            </ul>
            <div className="mt-8">
              <GoogleReviewsHeroBadge
                label={t('heroLanding.googleReviewsLabel')}
                ariaLabel={t('heroLanding.googleReviewsAria')}
              />
            </div>
            <MarketingStartAndDemoButtons
              onDark
              demoHref="/retail#contact"
              className="mt-8 sm:justify-start"
            />
          </div>
          <div className="relative rounded-3xl bg-white p-6 sm:p-10">
            <Image
              src="/images/hardware/hardware-vm20-sunmi.png"
              alt={t('retailSite.heroImageAlt')}
              width={720}
              height={560}
              priority
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-[#0b2433] border-y border-white/10" id="sectoren">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">
            {t('retailSite.usecasesTitle')}
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {RETAIL_ITEM_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-5 text-center font-semibold text-white"
              >
                {t(`sectorModal.columns.retail.items.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 sm:py-24" id="platform">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">
            {t('retailSite.modulesTitle')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULE_KEYS.map((key) => (
              <article key={key} className="rounded-2xl bg-[#0b2433] border border-white/10 p-6">
                <h3 className="text-lg font-bold text-[#5EC4E8] mb-2">
                  {t(`retailSite.modules.${key}.title`)}
                </h3>
                <p className="text-sm sm:text-base text-white/70 leading-relaxed">
                  {t(`retailSite.modules.${key}.body`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-[#0b2433] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">
            {t('retailSite.hardwareTitle')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {HARDWARE.map((item) => (
              <div key={item.src} className="rounded-2xl bg-white p-6 flex items-center justify-center min-h-[12rem]">
                <Image src={item.src} alt={item.alt} width={280} height={220} className="w-full h-auto object-contain max-h-40" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="prijzen" className="py-16 sm:py-24">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            {t('retailSite.pricingTitle')}
          </h2>
          <p className="text-white/70 mb-8">{t('pricing.subtitle')}</p>
          <div className="rounded-3xl bg-white text-gray-900 p-8">
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
            <MarketingStartAndDemoButtons demoHref="/retail#contact" className="mt-6" />
          </div>
        </div>
      </section>

      <div className="bg-white text-gray-900">
        <ContactPageSection sectionId="contact" />
      </div>
      <Footer />
      <CookieBanner />
    </main>
  )
}
