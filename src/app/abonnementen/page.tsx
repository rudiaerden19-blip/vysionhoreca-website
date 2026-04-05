'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Navigation, Footer, CookieBanner } from '@/components'
import { useLanguage } from '@/i18n'

const LIFESTYLE_IMAGE = '/images/abonnement-vysion-pro-lifestyle.png'

export default function AbonnementenPage() {
  const { t, locale } = useLanguage()
  const [isYearly, setIsYearly] = useState(false)

  const starterMonthly = 59
  const starterPrice = isYearly ? Math.round(starterMonthly * 12 * 0.9) : starterMonthly
  const periodLabel = isYearly ? t('pricing.perYear') : t('pricing.perMonth')

  return (
    <div className="min-h-screen bg-[#e3e3e3]">
      <Navigation />

      {/* Sectie 1 — intro (zoals mockup: titel, twee regels, vier voordeelkaarten) */}
      <section className="pt-28 sm:pt-32 pb-12 sm:pb-16 bg-[#e3e3e3]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">{t('subscriptionsPage.title')}</h1>
          <p className="text-xl text-gray-600 mb-4">{t('subscriptionsPage.subtitle')}</p>
          <p className="text-gray-600 leading-relaxed mb-10">{t('subscriptionsPage.lead')}</p>

          <ul className="space-y-4 text-left max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className="flex items-start gap-3 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
              >
                <svg
                  className="w-6 h-6 text-accent mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-800 leading-snug">{t(`subscriptionsPage.bullet${i}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sectie 2 — Vysion Pro: toggle, prijs links, tekst rechts */}
      <section className="pb-16 sm:pb-20 bg-[#e3e3e3] border-t border-gray-300/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
            {t('subscriptionsPage.vysionProHeading')}
          </h2>

          <div className="flex flex-col items-center mb-8">
            <div className="bg-white border border-gray-200 p-1 rounded-full inline-flex items-center shadow-sm">
              <button
                type="button"
                onClick={() => setIsYearly(false)}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  !isYearly ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('pricing.billingMonthly')}
              </button>
              <button
                type="button"
                onClick={() => setIsYearly(true)}
                className={`px-6 py-3 rounded-full font-semibold transition-all relative pr-8 ${
                  isYearly ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('pricing.billingYearly')}
                <span className="absolute -top-1.5 -right-1 bg-gray-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                  {t('pricing.badgeYearlyDiscount')}
                </span>
              </button>
            </div>
            {isYearly && <p className="text-gray-600 text-sm mt-3">{t('pricing.yearlySave')}</p>}
          </div>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-accent">{t('pricing.starter.name')}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-lg text-gray-400 line-through">
                    €{isYearly ? Math.round(99 * 12 * 0.9) : 99}
                    {t('pricing.perMonth')}
                  </span>
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                    {t('pricing.compareDiscountStarter')}
                  </span>
                </div>
                <div className="flex items-baseline mb-1">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900 tabular-nums">€{starterPrice}</span>
                  <span className="text-accent font-medium ml-2">{periodLabel}</span>
                </div>
                <p className="text-gray-500 text-xs mb-3">{t('pricing.exclVat')}</p>
                {isYearly && (
                  <p className="text-accent text-sm font-medium mb-4">
                    = €{Math.round(starterMonthly * 0.9)}
                    {t('pricing.perMonth')}
                  </p>
                )}

                <ul className="space-y-3 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600 text-sm sm:text-base leading-snug">
                        {t(`pricing.starter.features.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`/registreer?lang=${locale}&plan=starter&billing=${isYearly ? 'yearly' : 'monthly'}`}
                  className="block w-full border-2 border-gray-900 text-gray-900 text-center py-3.5 rounded-full font-semibold hover:bg-gray-900 hover:text-white transition-colors"
                >
                  {t('pricing.chooseStarter')}
                </a>
                <p className="text-center text-accent text-sm mt-3 font-medium">{t('pricing.cancelAnytime')}</p>
              </div>
            </div>

            <div className="lg:pt-2 flex flex-col">
              <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-6">
                {t('subscriptionsPage.vysionProRightP1')}
              </p>
              <p className="text-gray-600 text-base leading-relaxed mb-8">
                {t('subscriptionsPage.vysionProRightP2')}
              </p>
              <p className="text-gray-500 text-sm">{t('pricing.trialInfo')}</p>
              <a href="/prijzen" className="inline-block mt-6 text-accent font-semibold hover:underline">
                {t('subscriptionsPage.ctaPricing')} →
              </a>
              <div className="mt-8 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-md shadow-black/5">
                <Image
                  src={LIFESTYLE_IMAGE}
                  alt={t('subscriptionsPage.vysionProLifestyleAlt')}
                  width={733}
                  height={457}
                  className="w-full h-auto object-cover"
                  sizes="(min-width: 1024px) min(520px, 45vw), 100vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <CookieBanner />
    </div>
  )
}
